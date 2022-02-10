/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import uuid from 'uuid';
import { addIdToItem, removeIdFromItem } from '@kbn/securitysolution-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import {
  CreateExceptionListItemSchema,
  EntriesArray,
  Entry,
  EntryNested,
  ExceptionListItemSchema,
  ExceptionListType,
  ListSchema,
  NamespaceType,
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
  OsTypeArray,
  createExceptionListItemSchema,
  entriesList,
  entriesNested,
  entry,
  exceptionListItemSchema,
  nestedEntryItem,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  DataViewBase,
  DataViewFieldBase,
  getDataViewFieldSubtypeNested,
  isDataViewFieldSubtypeNested,
} from '@kbn/es-query';

import {
  EXCEPTION_OPERATORS,
  EXCEPTION_OPERATORS_SANS_LISTS,
  doesNotExistOperator,
  existsOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
} from '../autocomplete_operators';

import {
  BuilderEntry,
  CreateExceptionListItemBuilderSchema,
  EmptyEntry,
  EmptyNestedEntry,
  ExceptionsBuilderExceptionItem,
  FormattedBuilderEntry,
  OperatorOption,
} from '../types';

export const isEntryNested = (item: BuilderEntry): item is EntryNested => {
  return (item as EntryNested).entries != null;
};

export const filterExceptionItems = (
  exceptions: ExceptionsBuilderExceptionItem[]
): Array<ExceptionListItemSchema | CreateExceptionListItemSchema> => {
  return exceptions.reduce<Array<ExceptionListItemSchema | CreateExceptionListItemSchema>>(
    (acc, exception) => {
      const entries = exception.entries.reduce<BuilderEntry[]>((nestedAcc, singleEntry) => {
        const strippedSingleEntry = removeIdFromItem(singleEntry);

        if (entriesNested.is(strippedSingleEntry)) {
          const nestedEntriesArray = strippedSingleEntry.entries.filter((singleNestedEntry) => {
            const noIdSingleNestedEntry = removeIdFromItem(singleNestedEntry);
            const [validatedNestedEntry] = validate(noIdSingleNestedEntry, nestedEntryItem);
            return validatedNestedEntry != null;
          });
          const noIdNestedEntries = nestedEntriesArray.map((singleNestedEntry) =>
            removeIdFromItem(singleNestedEntry)
          );

          const [validatedNestedEntry] = validate(
            { ...strippedSingleEntry, entries: noIdNestedEntries },
            entriesNested
          );

          if (validatedNestedEntry != null) {
            return [...nestedAcc, { ...singleEntry, entries: nestedEntriesArray }];
          }
          return nestedAcc;
        } else {
          const [validatedEntry] = validate(strippedSingleEntry, entry);

          if (validatedEntry != null) {
            return [...nestedAcc, singleEntry];
          }
          return nestedAcc;
        }
      }, []);

      if (entries.length === 0) {
        return acc;
      }

      const item = { ...exception, entries };

      if (exceptionListItemSchema.is(item)) {
        return [...acc, item];
      } else if (createExceptionListItemSchema.is(item)) {
        const { meta, ...rest } = item;
        const itemSansMetaId: CreateExceptionListItemSchema = { ...rest, meta: undefined };
        return [...acc, itemSansMetaId];
      } else {
        return acc;
      }
    },
    []
  );
};

export const addIdToEntries = (entries: EntriesArray): EntriesArray => {
  return entries.map((singleEntry) => {
    if (singleEntry.type === 'nested') {
      return addIdToItem({
        ...singleEntry,
        entries: singleEntry.entries.map((nestedEntry) => addIdToItem(nestedEntry)),
      });
    } else {
      return addIdToItem(singleEntry);
    }
  });
};

export const getNewExceptionItem = ({
  listId,
  namespaceType,
  ruleName,
}: {
  listId: string;
  namespaceType: NamespaceType;
  ruleName: string;
}): CreateExceptionListItemBuilderSchema => {
  return {
    comments: [],
    description: `${ruleName} - exception list item`,
    entries: addIdToEntries([
      {
        field: '',
        operator: 'included',
        type: 'match',
        value: '',
      },
    ]),
    item_id: undefined,
    list_id: listId,
    meta: {
      temporaryUuid: uuid.v4(),
    },
    name: `${ruleName} - exception list item`,
    namespace_type: namespaceType,
    tags: [],
    type: 'simple',
  };
};

/**
 * Returns the operator type, may not need this if using io-ts types
 *
 * @param item a single ExceptionItem entry
 */
export const getOperatorType = (item: BuilderEntry): OperatorTypeEnum => {
  switch (item.type) {
    case 'match':
      return OperatorTypeEnum.MATCH;
    case 'match_any':
      return OperatorTypeEnum.MATCH_ANY;
    case 'wildcard':
      return OperatorTypeEnum.WILDCARD;
    case 'list':
      return OperatorTypeEnum.LIST;
    default:
      return OperatorTypeEnum.EXISTS;
  }
};

/**
 * Determines operator selection (is/is not/is one of, etc.)
 * Default operator is "is"
 *
 * @param item a single ExceptionItem entry
 */
export const getExceptionOperatorSelect = (item: BuilderEntry): OperatorOption => {
  if (item.type === 'nested') {
    return isOperator;
  } else {
    const operatorType = getOperatorType(item);
    const foundOperator = EXCEPTION_OPERATORS.find((operatorOption) => {
      return item.operator === operatorOption.operator && operatorType === operatorOption.type;
    });

    return foundOperator != null ? foundOperator : isOperator;
  }
};

/**
 * Returns the fields corresponding value for an entry
 *
 * @param item a single ExceptionItem entry
 */
export const getEntryValue = (item: BuilderEntry): string | string[] | undefined => {
  switch (item.type) {
    case OperatorTypeEnum.MATCH:
    case OperatorTypeEnum.MATCH_ANY:
    case OperatorTypeEnum.WILDCARD:
      return item.value;
    case OperatorTypeEnum.EXISTS:
      return undefined;
    case OperatorTypeEnum.LIST:
      return item.list.id;
    default:
      return undefined;
  }
};

/**
 * Determines whether an entire entry, exception item, or entry within a nested
 * entry needs to be removed
 *
 * @param exceptionItem
 * @param entryIndex index of given entry, for nested entries, this will correspond
 * to their parent index
 * @param nestedEntryIndex index of nested entry
 *
 */
export const getUpdatedEntriesOnDelete = (
  exceptionItem: ExceptionsBuilderExceptionItem,
  entryIndex: number,
  nestedParentIndex: number | null
): ExceptionsBuilderExceptionItem => {
  const itemOfInterest: BuilderEntry =
    exceptionItem.entries[nestedParentIndex != null ? nestedParentIndex : entryIndex];

  if (nestedParentIndex != null && itemOfInterest.type === OperatorTypeEnum.NESTED) {
    const updatedEntryEntries = [
      ...itemOfInterest.entries.slice(0, entryIndex),
      ...itemOfInterest.entries.slice(entryIndex + 1),
    ];

    if (updatedEntryEntries.length === 0) {
      return {
        ...exceptionItem,
        entries: [
          ...exceptionItem.entries.slice(0, nestedParentIndex),
          ...exceptionItem.entries.slice(nestedParentIndex + 1),
        ],
      };
    } else {
      const { field } = itemOfInterest;
      const updatedItemOfInterest: EntryNested | EmptyNestedEntry = {
        entries: updatedEntryEntries,
        field,
        id: itemOfInterest.id != null ? itemOfInterest.id : `${entryIndex}`,
        type: OperatorTypeEnum.NESTED,
      };

      return {
        ...exceptionItem,
        entries: [
          ...exceptionItem.entries.slice(0, nestedParentIndex),
          updatedItemOfInterest,
          ...exceptionItem.entries.slice(nestedParentIndex + 1),
        ],
      };
    }
  } else {
    return {
      ...exceptionItem,
      entries: [
        ...exceptionItem.entries.slice(0, entryIndex),
        ...exceptionItem.entries.slice(entryIndex + 1),
      ],
    };
  }
};

/**
 * Returns filtered index patterns based on the field - if a user selects to
 * add nested entry, should only show nested fields, if item is the parent
 * field of a nested entry, we only display the parent field
 *
 * @param patterns DataViewBase containing available fields on rule index
 * @param item exception item entry
 * set to add a nested field
 */
export const getFilteredIndexPatterns = (
  patterns: DataViewBase,
  item: FormattedBuilderEntry,
  type: ExceptionListType,
  preFilter?: (i: DataViewBase, t: ExceptionListType, o?: OsTypeArray) => DataViewBase,
  osTypes?: OsTypeArray
): DataViewBase => {
  const indexPatterns = preFilter != null ? preFilter(patterns, type, osTypes) : patterns;

  if (item.nested === 'child' && item.parent != null) {
    // when user has selected a nested entry, only fields with the common parent are shown
    return {
      ...indexPatterns,
      fields: indexPatterns.fields
        .filter((indexField) => {
          const subTypeNested = getDataViewFieldSubtypeNested(indexField);
          const fieldHasCommonParentPath =
            subTypeNested &&
            item.parent != null &&
            subTypeNested.nested.path === item.parent.parent.field;

          return fieldHasCommonParentPath;
        })
        .map((f) => {
          const [fieldNameWithoutParentPath] = f.name.split('.').slice(-1);
          return { ...f, name: fieldNameWithoutParentPath };
        }),
    };
  } else if (item.nested === 'parent' && item.field != null) {
    // when user has selected a nested entry, right above it we show the common parent
    return { ...indexPatterns, fields: [item.field] };
  } else if (item.nested === 'parent' && item.field == null) {
    // when user selects to add a nested entry, only nested fields are shown as options
    return {
      ...indexPatterns,
      fields: indexPatterns.fields.filter((field) => isDataViewFieldSubtypeNested(field)),
    };
  } else {
    return indexPatterns;
  }
};

/**
 * Determines proper entry update when user selects new field
 *
 * @param item - current exception item entry values
 * @param newField - newly selected field
 *
 */
export const getEntryOnFieldChange = (
  item: FormattedBuilderEntry,
  newField: DataViewFieldBase
): { index: number; updatedEntry: BuilderEntry } => {
  const { parent, entryIndex, nested } = item;
  const newChildFieldValue = newField != null ? newField.name.split('.').slice(-1)[0] : '';

  if (nested === 'parent') {
    // For nested entries, when user first selects to add a nested
    // entry, they first see a row similar to what is shown for when
    // a user selects "exists", as soon as they make a selection
    // we can now identify the 'parent' and 'child' this is where
    // we first convert the entry into type "nested"
    const subTypeNested = getDataViewFieldSubtypeNested(newField);
    const newParentFieldValue = subTypeNested?.nested.path || '';

    return {
      index: entryIndex,
      updatedEntry: {
        entries: [
          addIdToItem({
            field: newChildFieldValue != null ? newChildFieldValue : '',
            operator: isOperator.operator,
            type: OperatorTypeEnum.MATCH,
            value: '',
          }),
        ],
        field: newParentFieldValue,
        id: item.id,
        type: OperatorTypeEnum.NESTED,
      },
    };
  } else if (nested === 'child' && parent != null) {
    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: newChildFieldValue != null ? newChildFieldValue : '',
            id: item.id,
            operator: isOperator.operator,
            type: OperatorTypeEnum.MATCH,
            value: '',
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: newField != null ? newField.name : '',
        id: item.id,
        operator: isOperator.operator,
        type: OperatorTypeEnum.MATCH,
        value: '',
      },
    };
  }
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "list"
 *
 * @param item - current exception item entry values
 * @param newField - newly selected list
 *
 */
export const getEntryOnListChange = (
  item: FormattedBuilderEntry,
  newField: ListSchema
): { index: number; updatedEntry: BuilderEntry } => {
  const { entryIndex, field, operator } = item;
  const { id, type } = newField;

  return {
    index: entryIndex,
    updatedEntry: {
      field: field != null ? field.name : '',
      id: item.id,
      list: { id, type },
      operator: operator.operator,
      type: OperatorTypeEnum.LIST,
    },
  };
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "match_any"
 *
 * @param item - current exception item entry values
 * @param newField - newly entered value
 *
 */
export const getEntryOnMatchAnyChange = (
  item: FormattedBuilderEntry,
  newField: string[]
): { index: number; updatedEntry: BuilderEntry } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            id: item.id,
            operator: operator.operator,
            type: OperatorTypeEnum.MATCH_ANY,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: field != null ? field.name : '',
        id: item.id,
        operator: operator.operator,
        type: OperatorTypeEnum.MATCH_ANY,
        value: newField,
      },
    };
  }
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "match"
 *
 * @param item - current exception item entry values
 * @param newField - newly entered value
 *
 */
export const getEntryOnMatchChange = (
  item: FormattedBuilderEntry,
  newField: string
): { index: number; updatedEntry: BuilderEntry } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            id: item.id,
            operator: operator.operator,
            type: OperatorTypeEnum.MATCH,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: field != null ? field.name : '',
        id: item.id,
        operator: operator.operator,
        type: OperatorTypeEnum.MATCH,
        value: newField,
      },
    };
  }
};

/**
 * Determines proper entry update when user updates value
 * when operator is of type "wildcard"
 *
 * @param item - current exception item entry values
 * @param newField - newly entered value
 *
 */
export const getEntryOnWildcardChange = (
  item: FormattedBuilderEntry,
  newField: string
): { index: number; updatedEntry: BuilderEntry } => {
  const { nested, parent, entryIndex, field, operator } = item;

  if (nested != null && parent != null) {
    const fieldName = field != null ? field.name.split('.').slice(-1)[0] : '';

    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            field: fieldName,
            id: item.id,
            operator: operator.operator,
            type: OperatorTypeEnum.WILDCARD,
            value: newField,
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return {
      index: entryIndex,
      updatedEntry: {
        field: field != null ? field.name : '',
        id: item.id,
        operator: operator.operator,
        type: OperatorTypeEnum.WILDCARD,
        value: newField,
      },
    };
  }
};

/**
 * On operator change, determines whether value needs to be cleared or not
 *
 * @param field
 * @param selectedOperator
 * @param currentEntry
 *
 */
export const getEntryFromOperator = (
  selectedOperator: OperatorOption,
  currentEntry: FormattedBuilderEntry
): Entry & { id?: string } => {
  const isSameOperatorType = currentEntry.operator.type === selectedOperator.type;
  const fieldValue = currentEntry.field != null ? currentEntry.field.name : '';
  switch (selectedOperator.type) {
    case 'match':
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.MATCH,
        value:
          isSameOperatorType && typeof currentEntry.value === 'string' ? currentEntry.value : '',
      };
    case 'match_any':
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.MATCH_ANY,
        value: isSameOperatorType && Array.isArray(currentEntry.value) ? currentEntry.value : [],
      };
    case 'list':
      return {
        field: fieldValue,
        id: currentEntry.id,
        list: { id: '', type: 'ip' },
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.LIST,
      };
    case 'wildcard':
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.WILDCARD,
        value:
          isSameOperatorType && typeof currentEntry.value === 'string' ? currentEntry.value : '',
      };
    default:
      return {
        field: fieldValue,
        id: currentEntry.id,
        operator: selectedOperator.operator,
        type: OperatorTypeEnum.EXISTS,
      };
  }
};

/**
 * Determines proper entry update when user selects new operator
 *
 * @param item - current exception item entry values
 * @param newOperator - newly selected operator
 *
 */
export const getEntryOnOperatorChange = (
  item: FormattedBuilderEntry,
  newOperator: OperatorOption
): { updatedEntry: BuilderEntry; index: number } => {
  const { parent, entryIndex, field, nested } = item;
  const newEntry = getEntryFromOperator(newOperator, item);

  if (!entriesList.is(newEntry) && nested != null && parent != null) {
    return {
      index: parent.parentIndex,
      updatedEntry: {
        ...parent.parent,
        entries: [
          ...parent.parent.entries.slice(0, entryIndex),
          {
            ...newEntry,
            field: field != null ? field.name.split('.').slice(-1)[0] : '',
          },
          ...parent.parent.entries.slice(entryIndex + 1),
        ],
      },
    };
  } else {
    return { index: entryIndex, updatedEntry: newEntry };
  }
};

/**
 * Determines which operators to make available
 *
 * @param item
 * @param listType
 * @param isBoolean
 * @param includeValueListOperators whether or not to include the 'is in list' and 'is not in list' operators
 */
export const getOperatorOptions = (
  item: FormattedBuilderEntry,
  listType: ExceptionListType,
  isBoolean: boolean,
  includeValueListOperators = true
): OperatorOption[] => {
  if (item.nested === 'parent' || item.field == null) {
    return [isOperator];
  } else if ((item.nested != null && listType === 'endpoint') || listType === 'endpoint') {
    return isBoolean ? [isOperator] : [isOperator, isOneOfOperator];
  } else if (item.nested != null && listType === 'detection') {
    return isBoolean ? [isOperator, existsOperator] : [isOperator, isOneOfOperator, existsOperator];
  } else {
    return isBoolean
      ? [isOperator, isNotOperator, existsOperator, doesNotExistOperator]
      : includeValueListOperators
      ? EXCEPTION_OPERATORS
      : EXCEPTION_OPERATORS_SANS_LISTS;
  }
};

/**
 * Fields of type 'text' do not generate autocomplete values, we want
 * to find it's corresponding keyword type (if available) which does
 * generate autocomplete values
 *
 * @param fields IFieldType fields
 * @param selectedField the field name that was selected
 * @param isTextType we only want a corresponding keyword field if
 * the selected field is of type 'text'
 *
 */
export const getCorrespondingKeywordField = ({
  fields,
  selectedField,
}: {
  fields: DataViewFieldBase[];
  selectedField: string | undefined;
}): DataViewFieldBase | undefined => {
  const selectedFieldBits =
    selectedField != null && selectedField !== '' ? selectedField.split('.') : [];
  const selectedFieldIsTextType = selectedFieldBits.slice(-1)[0] === 'text';

  if (selectedFieldIsTextType && selectedFieldBits.length > 0) {
    const keywordField = selectedFieldBits.slice(0, selectedFieldBits.length - 1).join('.');
    const [foundKeywordField] = fields.filter(
      ({ name }) => keywordField !== '' && keywordField === name
    );
    return foundKeywordField;
  }

  return undefined;
};

/**
 * Formats the entry into one that is easily usable for the UI, most of the
 * complexity was introduced with nested fields
 *
 * @param patterns DataViewBase containing available fields on rule index
 * @param item exception item entry
 * @param itemIndex entry index
 * @param parent nested entries hold copy of their parent for use in various logic
 * @param parentIndex corresponds to the entry index, this might seem obvious, but
 * was added to ensure that nested items could be identified with their parent entry
 */
export const getFormattedBuilderEntry = (
  indexPattern: DataViewBase,
  item: BuilderEntry,
  itemIndex: number,
  parent: EntryNested | undefined,
  parentIndex: number | undefined
): FormattedBuilderEntry => {
  const { fields } = indexPattern;
  const field = parent != null ? `${parent.field}.${item.field}` : item.field;
  const [foundField] = fields.filter(({ name }) => field != null && field === name);
  const correspondingKeywordField = getCorrespondingKeywordField({
    fields,
    selectedField: field,
  });

  if (parent != null && parentIndex != null) {
    return {
      correspondingKeywordField,
      entryIndex: itemIndex,
      field:
        foundField != null
          ? { ...foundField, name: foundField.name.split('.').slice(-1)[0] }
          : foundField,
      id: item.id != null ? item.id : `${itemIndex}`,
      nested: 'child',
      operator: getExceptionOperatorSelect(item),
      parent: { parent, parentIndex },
      value: getEntryValue(item),
    };
  } else {
    return {
      correspondingKeywordField,
      entryIndex: itemIndex,
      field: foundField,
      id: item.id != null ? item.id : `${itemIndex}`,
      nested: undefined,
      operator: getExceptionOperatorSelect(item),
      parent: undefined,
      value: getEntryValue(item),
    };
  }
};

/**
 * Formats the entries to be easily usable for the UI, most of the
 * complexity was introduced with nested fields
 *
 * @param patterns DataViewBase containing available fields on rule index
 * @param entries exception item entries
 * @param addNested boolean noting whether or not UI is currently
 * set to add a nested field
 * @param parent nested entries hold copy of their parent for use in various logic
 * @param parentIndex corresponds to the entry index, this might seem obvious, but
 * was added to ensure that nested items could be identified with their parent entry
 */
export const getFormattedBuilderEntries = (
  indexPattern: DataViewBase,
  entries: BuilderEntry[],
  parent?: EntryNested,
  parentIndex?: number
): FormattedBuilderEntry[] => {
  return entries.reduce<FormattedBuilderEntry[]>((acc, item, index) => {
    const isNewNestedEntry = item.type === 'nested' && item.entries.length === 0;
    if (item.type !== 'nested' && !isNewNestedEntry) {
      const newItemEntry: FormattedBuilderEntry = getFormattedBuilderEntry(
        indexPattern,
        item,
        index,
        parent,
        parentIndex
      );
      return [...acc, newItemEntry];
    } else {
      const parentEntry: FormattedBuilderEntry = {
        correspondingKeywordField: undefined,
        entryIndex: index,
        field: isNewNestedEntry
          ? undefined
          : // This type below is really a FieldSpec type from "src/plugins/data/common/index_patterns/fields/types.ts", we cast it here to keep using the DataViewFieldBase interface
            ({
              aggregatable: false,
              esTypes: ['nested'],
              name: item.field != null ? item.field : '',
              searchable: false,
              type: 'string',
            } as DataViewFieldBase),
        id: item.id != null ? item.id : `${index}`,
        nested: 'parent',
        operator: isOperator,
        parent: undefined,
        value: undefined,
      };

      // User has selected to add a nested field, but not yet selected the field
      if (isNewNestedEntry) {
        return [...acc, parentEntry];
      }

      if (isEntryNested(item)) {
        const nestedItems = getFormattedBuilderEntries(indexPattern, item.entries, item, index);

        return [...acc, parentEntry, ...nestedItems];
      }

      return [...acc];
    }
  }, []);
};

export const getDefaultEmptyEntry = (): EmptyEntry => ({
  field: '',
  id: uuid.v4(),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.MATCH,
  value: '',
});

export const getDefaultNestedEmptyEntry = (): EmptyNestedEntry => ({
  entries: [],
  field: '',
  id: uuid.v4(),
  type: OperatorTypeEnum.NESTED,
});

export const containsValueListEntry = (items: ExceptionsBuilderExceptionItem[]): boolean =>
  items.some((item) => item.entries.some(({ type }) => type === OperatorTypeEnum.LIST));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  areTypeNamesEqual,
  cleanUpConvertedUnionItems,
  findTypeDefinition,
  getCombinedGlobalName,
  getGlobalScopeLink,
  isUnionOfInstanceAndArray,
} from './utils';
import type { AutocompleteBodyParams, GlobalDefinition, SpecificationTypes as S } from './types';

/**
 * Types important for this conversion
 * Body = ValueBody | PropertiesBody | NoBody
 * ValueOf = InstanceOf | ArrayOf | UnionOf | DictionaryOf | UserDefinedValue | LiteralValue
 *
 * Request has `body` property which is "Body"
 * - "Body" can be one of
 *   - "ValueBody"
 *     - has a `value` property which is "ValueOf"
 *     - convert "ValueOf"
 *   - "PropertiesBody"
 *     - has a `properties` property which is "Property[]"
 *     - each "Property" has a `type` property which is "ValueOf"
 *     - convert "ValueOf"
 *   - "NoBody"
 *     - this an empty request body
 *
 * Convert "ValueOf" which can be one of
 * - "InstanceOf"
 *   - has a `type` property which is "TypeName"
 *     - if "TypeName" has a `namespace` = "_builtins" then it's a primitive type
 *     - if "TypeName" has a `namespace` = "_types" then it's a defined type that can be found in the schema
 *       - the found "TypeDefinition" can be
 *         - "Enum"
 *           - has a `members` property which is "EnumMember[]"
 *           - each "EnumMember" has a `name` property
 *           - convert `name` to a value
 *         - "TypeAlias"
 *           - has a `type` property which is "ValueOf"
 *         - "Interface"
 *           - has a `properties` property which is "Property[]"
 *           - each "Property" has a `type` property which is "ValueOf"
 * - "ArrayOf"
 *   - has a `value` property which is "ValueOf"
 * - "UnionOf"
 *   - has a `items` property which is "ValueOf[]"
 * - "DictionaryOf"
 *   - has a `key` and a `value` properties which are both "ValueOf"
 * - "UserDefinedValue"
 *   - can be any arbitrary value
 * - "LiteralValue"
 *   - has a `value` property which is string, number or boolean
 */

export class BodyParamsConverter {
  private currentTypes: S.TypeName[];
  private globalTypes: S.TypeName[];
  private processedGlobals: S.TypeName[];
  private readonly schema: S.Model;

  constructor(schema: S.Model) {
    this.currentTypes = [];
    this.globalTypes = [];
    this.processedGlobals = [];
    this.schema = schema;
  }

  public generate(body: S.Body): AutocompleteBodyParams {
    this.currentTypes = [];
    const { kind } = body;
    switch (kind) {
      case 'no_body': {
        return {};
      }
      case 'value': {
        return this.convertValueOf(body.value, undefined);
      }
      case 'properties': {
        return this.convertProperties(body.properties);
      }
    }
  }

  private convertProperties(properties: S.Property[]): AutocompleteBodyParams {
    const bodyParams = {} as AutocompleteBodyParams;
    for (const property of properties) {
      const { type, name, serverDefault } = property;
      bodyParams[name] = this.convertValueOf(type, serverDefault);
    }
    return bodyParams;
  }

  private convertValueOf(valueOf: S.ValueOf, serverDefault: S.Property['serverDefault']): any {
    const { kind } = valueOf;
    switch (kind) {
      case 'instance_of':
        return this.convertInstanceOf(valueOf, serverDefault);
      case 'array_of':
        return this.convertArrayOf(valueOf, serverDefault);
      case 'union_of':
        return this.convertUnionOf(valueOf, serverDefault);
      case 'dictionary_of':
        return this.convertDictionaryOf(valueOf, serverDefault);
      case 'literal_value':
        return this.convertLiteralValue(valueOf, serverDefault);
      case 'user_defined_value':
      default:
        return '';
    }
  }

  private convertInstanceOf(
    instanceOf: S.InstanceOf,
    serverDefault: S.Property['serverDefault']
  ): any {
    const { type } = instanceOf;
    if (type.namespace === '_builtins') {
      /**
       * - `string`, `boolean`, `number`, `null`, `void`, `binary`
       */
      if (type.name === 'boolean') {
        return serverDefault ? serverDefault : { __one_of: [true, false] };
      }
      return serverDefault ? serverDefault.toString() : '';
    } else {
      return this.convertTypeName(type, serverDefault);
    }
  }

  private convertTypeName(typeName: S.TypeName, serverDefault: S.Property['serverDefault']): any {
    const definedType = findTypeDefinition(this.schema, typeName);
    if (definedType) {
      if (this.isInCurrentTypes(typeName)) {
        this.addGlobalType(typeName);
        return getGlobalScopeLink(typeName);
      } else {
        this.currentTypes.push(typeName);
      }
      let result;
      // interface
      if (definedType.kind === 'interface') {
        result = this.convertProperties(definedType.properties);
      } else if (definedType.kind === 'enum') {
        // enum
        result = this.convertEnum(definedType);
      } else if (definedType.kind === 'type_alias') {
        // type_alias
        result = this.convertTypeAlias(definedType, serverDefault);
      }
      this.currentTypes.pop();
      return result;
    }
  }

  private convertArrayOf = (
    arrayOf: S.ArrayOf,
    serverDefault: S.Property['serverDefault']
  ): any => {
    return [this.convertValueOf(arrayOf.value, serverDefault)];
  };

  private convertUnionOf = (
    unionOf: S.UnionOf,
    serverDefault: S.Property['serverDefault']
  ): any => {
    let items;
    if (isUnionOfInstanceAndArray(unionOf)) {
      items = [this.convertValueOf(unionOf.items[0], serverDefault)];
    } else {
      items = unionOf.items.map((item) => this.convertValueOf(item, undefined));
      if (serverDefault) {
        items.unshift(serverDefault);
      }
    }
    items = cleanUpConvertedUnionItems(items);
    if (items.length > 0) {
      return {
        __one_of: items,
      };
    }
    return [];
  };

  private convertDictionaryOf = (
    dictionaryOf: S.DictionaryOf,
    serverDefault: S.Property['serverDefault']
  ): any => {
    let key = this.convertValueOf(dictionaryOf.key, undefined);
    if (key === '') {
      key = 'NAME';
    }
    const value = this.convertValueOf(dictionaryOf.value, serverDefault);
    return {
      [key]: value,
    };
  };

  private convertLiteralValue = (
    literalValue: S.LiteralValue,
    serverDefault: S.Property['serverDefault']
  ): any => {
    return serverDefault ? serverDefault.toString() : literalValue.value;
  };

  private convertEnum(enumType: S.Enum): any {
    return {
      __one_of: enumType.members.map((member) => member.name),
    };
  }

  private convertTypeAlias(
    typeAlias: S.TypeAlias,
    serverDefault: S.Property['serverDefault']
  ): any {
    return this.convertValueOf(typeAlias.type, serverDefault);
  }

  private isInCurrentTypes(type: S.TypeName): boolean {
    const foundType = this.currentTypes.find((currentType) => areTypeNamesEqual(currentType, type));
    return !!foundType;
  }

  private addGlobalType(typeName: S.TypeName) {
    const foundType = this.globalTypes.find((t) => areTypeNamesEqual(t, typeName));
    const foundProcessed = this.processedGlobals.find((t) => areTypeNamesEqual(t, typeName));
    if (!foundType && !foundProcessed) {
      this.globalTypes.push(typeName);
    }
  }

  public getPublicTypes(): S.TypeName[] {
    return Array.from(this.globalTypes);
  }

  public convertGlobals(): GlobalDefinition[] {
    const globalDefinitions = [];
    while (this.globalTypes.length > 0) {
      const globalType = this.globalTypes.shift();
      if (globalType) {
        this.currentTypes = [];
        const params = this.convertTypeName(globalType, undefined);
        const name = getCombinedGlobalName(globalType);
        this.processedGlobals.push(globalType);
        globalDefinitions.push({ name, params });
      }
    }
    return globalDefinitions;
  }
}

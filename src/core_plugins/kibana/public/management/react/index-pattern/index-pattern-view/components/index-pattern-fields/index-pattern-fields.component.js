import React from 'react';
import {
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiTitle,
  KuiText,
  KuiLink,
  KuiBadge,
  KuiForm,
  KuiFormRow,
  KuiFieldText,
  KuiSwitch,
  KuiCheckbox,
  KuiSelect,
  KuiIcon,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableHeaderCellCheckbox,
  KuiTableBody,
  KuiTableHeader,
  KuiButton,
  KuiButtonEmpty,
  KuiFlexGroup,
  KuiFlexItem,
  KuiPagination,
  KuiHorizontalRule,
} from 'ui_framework/components';

import { getKbnTypeNames } from 'src/utils/kbn_field_types';

const IndexPatternFields = ({
  indexPattern: {
    fields,
    pattern,
  },
  numOfPages,
  perPage,
  page,
  goToPage,
  changeSort,
  sortBy,
  sortAsc,
  filter,
  filterBy,
  changePerPage,
}) => {
  // console.log('IndexPatternFields', fields);
  if (fields === undefined) {
    return null;
  }

  const rows = fields.map((item, key) => {
    return (
      <KuiTableRow key={key}>
        <KuiTableRowCell>
          {item.name}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {item.type}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {item.searchable.toString()}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {item.aggregatable.toString()}
        </KuiTableRowCell>
      </KuiTableRow>
    );
  });

  const fieldTypes = getKbnTypeNames().map(name => {
    return {
      text: name[0].toUpperCase() + name.slice(1),
      value: name,
    };
  });

  fieldTypes.unshift({ text: 'Filter by field types', value: false });

  return (
    <KuiPageContent>
      <KuiPageContentHeader>
        <KuiForm>
          <KuiFormRow>
            <KuiFlexGroup>
              <KuiFlexItem>
                <KuiFieldText
                  placeholder="Search..."
                  icon="search"
                  value={filterBy ? filterBy.name : null}
                  onChange={(e) => filter({ name: e.target.value })}
                />
              </KuiFlexItem>
               <KuiFlexItem>
                <KuiSelect
                  onChange={(e) => filter({ type: e.target.value }, fields)}
                  value={filterBy ? filterBy.type : null}
                  options={fieldTypes}
                />
              </KuiFlexItem>
            </KuiFlexGroup>
          </KuiFormRow>
        </KuiForm>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiTable>
          <KuiTableHeader>
            <KuiTableHeaderCell
              onSort={() => changeSort('name')}
              isSorted={sortBy === 'name'}
              isSortAscending={sortAsc}
            >
              Name
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => changeSort('type')}
              isSorted={sortBy === 'type'}
              isSortAscending={sortAsc}
            >
              Type
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => changeSort('searchable')}
              isSorted={sortBy === 'searchable'}
              isSortAscending={sortAsc}
            >
              Searchable
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => changeSort('aggregatable')}
              isSorted={sortBy === 'aggregatable'}
              isSortAscending={sortAsc}
            >
              Aggregatable
            </KuiTableHeaderCell>
          </KuiTableHeader>
          <KuiTableBody>
            {rows}
          </KuiTableBody>
        </KuiTable>
        <KuiHorizontalRule />
        <KuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <KuiFlexItem grow={false}>
            <KuiText size="small">
              Rows per page:
            </KuiText>
            <KuiSelect
              value={perPage}
              onChange={(e) => changePerPage(e.target.value)}
              options={[
                { value: 1, text: 1 },
                { value: 10, text: 10 },
                { value: 20, text: 20 },
                { value: 50, text: 50 },
              ]}
            />
          </KuiFlexItem>
          {numOfPages > 1
            ?
              <KuiFlexItem grow={false}>
                <KuiPagination
                  pageCount={numOfPages}
                  activePage={page}
                  onPageClick={goToPage}
                />
              </KuiFlexItem>
            : null
          }
        </KuiFlexGroup>
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

export default IndexPatternFields;

import React from 'react';
import {
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiText,
  KuiForm,
  KuiFormRow,
  KuiFieldText,
  KuiSelect,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableBody,
  KuiTableHeader,
  KuiFlexGroup,
  KuiFlexItem,
  KuiPagination,
  KuiHorizontalRule,
} from 'ui_framework/components';

import { getKbnTypeNames } from 'src/utils/kbn_field_types';

const IndexPatternFields = ({
  fields,
  numOfPages,
  perPage,
  page,
  setPage,
  setSortBy,
  sortBy,
  sortAsc,
  setFilterBy,
  filterBy,
  setPerPage,
}) => {
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

  fieldTypes.unshift({ text: 'Filter by field types', value: '' });

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
                  onChange={(e) => setFilterBy({ name: e.target.value })}
                />
              </KuiFlexItem>
              <KuiFlexItem>
                <KuiSelect
                  onChange={(e) => setFilterBy({ type: e.target.value }, fields)}
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
              onSort={() => setSortBy('name')}
              isSorted={sortBy === 'name'}
              isSortAscending={sortAsc}
            >
              Name
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => setSortBy('type')}
              isSorted={sortBy === 'type'}
              isSortAscending={sortAsc}
            >
              Type
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => setSortBy('searchable')}
              isSorted={sortBy === 'searchable'}
              isSortAscending={sortAsc}
            >
              Searchable
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => setSortBy('aggregatable')}
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
              onChange={(e) => setPerPage(e.target.value)}
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
                  onPageClick={setPage}
                />
              </KuiFlexItem>
            : null
          }
        </KuiFlexGroup>
      </KuiPageContentBody>
    </KuiPageContent>
  );
};

export { IndexPatternFields };

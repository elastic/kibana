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
  KuiCheckbox,
  KuiSelect,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableHeaderCellCheckbox,
  KuiTableBody,
  KuiTableHeader,
  KuiButtonEmpty,
  KuiFlexGroup,
  KuiFlexItem,
  KuiPagination,
  KuiHorizontalRule,
} from 'ui_framework/components';


const IndexPatternList = ({
  indexPatterns,
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
  if (indexPatterns === undefined) {
    return null;
  }

  const indexRows = indexPatterns.map((index, key) => {
    return (
      <KuiTableRow key={key}>
        <KuiTableHeaderCellCheckbox>
          <KuiCheckbox/>
        </KuiTableHeaderCellCheckbox>
        <KuiTableRowCell>
          <KuiLink href={`#/management/kibana/indices/${index.attributes.title}`}>
            {index.attributes.title}
          </KuiLink>
          &nbsp;&nbsp;
          {index.isDefault
            ? <KuiBadge>Default index</KuiBadge>
            : null
          }
        </KuiTableRowCell>
        {/* <KuiTableRowCell>
          {index.indices}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {index.fields}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {index.creator}
        </KuiTableRowCell> */}
      </KuiTableRow>
    );
  });

  return (
    <KuiPageContent>
      <KuiPageContentHeader>
        <KuiPageContentHeaderSection>
          <KuiTitle>
            <h2>Index patterns</h2>
          </KuiTitle>
        </KuiPageContentHeaderSection>
        <KuiPageContentHeaderSection>
          <KuiButtonEmpty>
            <KuiLink
              href="#/management/kibana/index"
            >
              Create new index pattern
            </KuiLink>
          </KuiButtonEmpty>
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiForm>
          <KuiFormRow>
            <KuiFlexGroup>
              <KuiFlexItem>
                <KuiFieldText
                  placeholder="Search for an index pattern..."
                  icon="search"
                  value={filterBy['attributes.title']}
                  onChange={(e) => setFilterBy({ ['attributes.title']: e.target.value })}
                />
              </KuiFlexItem>
              {/* <KuiFlexItem>
                <KuiSelect placeholder="Filter by creator">

                </KuiSelect>
              </KuiFlexItem> */}
            </KuiFlexGroup>
          </KuiFormRow>
        </KuiForm>
        <KuiTable>
          <KuiTableHeader>
            <KuiTableHeaderCell>
              <KuiCheckbox/>
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => setSortBy('name')}
              isSorted={sortBy === 'name'}
              isSortAscending={sortAsc}
            >
              Name
            </KuiTableHeaderCell>
            {/* <KuiTableHeaderCell
              onSort={() => setSortBy('indices')}
              isSorted={sortBy === 'indices'}
              isSortAscending={sortAsc}
            >
              Matching Indices
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => setSortBy('fields')}
              isSorted={sortBy === 'fields'}
              isSortAscending={sortAsc}
            >
              Fields
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => setSortBy('creator')}
              isSorted={sortBy === 'creator'}
              isSortAscending={sortAsc}
            >
              Created by
            </KuiTableHeaderCell> */}
          </KuiTableHeader>
          <KuiTableBody>
            {indexRows}
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

export { IndexPatternList };

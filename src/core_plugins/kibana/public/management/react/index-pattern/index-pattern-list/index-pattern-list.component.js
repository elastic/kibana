/* eslint-disable */
import React, { Component } from 'react';
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


const IndexPatternList = ({
  items,
  numOfPages,
  perPage,
  page,
  goToPage,
  changeSort,
  sortBy,
  sortAsc,
  filter,
  changePerPage,
}) => {
  console.log('IndexPatternList', items, perPage);
  if (items === undefined) {
    return null;
  }

  const indexRows = items.map((index, key) => {
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
                  onChange={(e) => filter(e.target.value)}
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
              onSort={() => changeSort('name')}
              isSorted={sortBy === 'name'}
              isSortAscending={sortAsc}
            >
              Name
            </KuiTableHeaderCell>
            {/* <KuiTableHeaderCell
              onSort={() => changeSort('indices')}
              isSorted={sortBy === 'indices'}
              isSortAscending={sortAsc}
            >
              Matching Indices
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => changeSort('fields')}
              isSorted={sortBy === 'fields'}
              isSortAscending={sortAsc}
            >
              Fields
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => changeSort('creator')}
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

export default IndexPatternList;

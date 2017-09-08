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
  KuiForm,
  KuiFormRow,
  KuiFieldText,
  KuiSwitch,
  KuiSelect,
  KuiIcon,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableBody,
  KuiTableHeader,
  KuiButton,
  KuiButtonEmpty,
  KuiFlexGroup,
  KuiFlexItem,
} from 'ui_framework/components';


const IndexPatternList = ({
  items,
  changeSort,
  sortBy,
  sortAsc,
}) => {
  console.log('IndexPatternList', items, sortBy, sortAsc);
  if (items === undefined) {
    return null;
  }

  const indexRows = items.map((index, key) => {
    return (
      <KuiTableRow key={key}>
        <KuiTableRowCell>
          {index.attributes.title}
        </KuiTableRowCell>
        <KuiTableRowCell>
          {index.count}
        </KuiTableRowCell>
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
          <KuiButton
            fill
          >
            <KuiLink
              href="#/management/kibana/index"
            >
              Create new index pattern
            </KuiLink>
          </KuiButton>
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiForm>
          <KuiFormRow>
            <KuiFlexGroup>
              <KuiFlexItem>
                <KuiFieldText
                  defaultValue="Search for an index pattern..."
                  icon="search"
                />
              </KuiFlexItem>
              <KuiFlexItem>
              </KuiFlexItem>
            </KuiFlexGroup>
          </KuiFormRow>
        </KuiForm>
        <KuiTable>
          <KuiTableHeader>
            <KuiTableHeaderCell>
              <KuiSwitch
              />
            </KuiTableHeaderCell>
            <KuiTableHeaderCell
              onSort={() => changeSort('name')}
              isSorted={sortBy === 'name'}
              isSortAscending={sortAsc}
            >
              Name
            </KuiTableHeaderCell>
          </KuiTableHeader>
          <KuiTableBody>
            {indexRows}
          </KuiTableBody>
        </KuiTable>
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

export default IndexPatternList;

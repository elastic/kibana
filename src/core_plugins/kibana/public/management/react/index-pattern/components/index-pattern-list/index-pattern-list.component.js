/* eslint-disable */
import React, { Component } from 'react';
import {
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiTitle,
  KuiText,
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
  indexPatterns,
  sortBy,
}) => {
  // const indexRows = indices.map((index, key) => {
  //   return (
  //     <KuiTableRow key={key}>
  //       <KuiTableRowCell>
  //         {index.name}
  //       </KuiTableRowCell>
  //       <KuiTableRowCell>
  //         {index.count}
  //       </KuiTableRowCell>
  //     </KuiTableRow>
  //   );
  // });

  return (
    <KuiPageContent>
      <KuiPageContentHeader>
        <KuiPageContentHeaderSection>
          <KuiTitle>
            <h2>Index Pattern</h2>
          </KuiTitle>
        </KuiPageContentHeaderSection>
        <KuiPageContentHeaderSection>
          <KuiButton
            fill
          >
            Create new index pattern
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
            <KuiTableHeaderCell>
              <KuiButtonEmpty
                onClick={() => changeSortAction('name')}
              >
                Name
                { sortBy === 'name'
                  ?
                    <span>
                      &nbsp;
                      <KuiIcon
                        type={sortAsc ? 'arrowUp' : 'arrowDown'}
                        size="medium"
                      />
                    </span>
                  : null
                }
                </KuiButtonEmpty>
            </KuiTableHeaderCell>
          </KuiTableHeader>
        </KuiTable>
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

export default IndexPatternList;

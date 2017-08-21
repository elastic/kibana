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
  KuiSwitch,
  KuiSelect,
  KuiIcon,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableBody,
  KuiTableHeader,
  KuiButtonEmpty,
  KuiFlexGroup,
  KuiFlexItem,
} from 'ui_framework/components';

import { InputPatternInputField } from './lib/index-pattern-input-field';

const IndexPattern = ({
  filteredIndices,
  indices,
  timeFields,
  hasExactMatches,
  page,
  perPage,
  sortBy,
  sortAsc,
  includeSystemIndices,
  includeSystemIndicesAction,
  excludeSystemIndicesAction,
  fetchIndicesAction,
  goToNextPageAction,
  goToPreviousPageAction,
  changeSortAction,
}) => {
  const indexRows = indices.map((index, key) => {
    return (
      <KuiTableRow key={key}>
        <KuiTableRowCell>
          {index.name}
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
            <h2>Create new Index Pattern</h2>
          </KuiTitle>
          <KuiText size="small">
            <p>
              Index patterns are used to identify the Elasticsearch indices to run search and analytics against.
              <br/>
              They are also used to configure fields.
            </p>
          </KuiText>
        </KuiPageContentHeaderSection>
        <KuiPageContentHeaderSection>
          <KuiSwitch
            label="Include system indices"
            checked={includeSystemIndices}
            onChange={includeSystemIndices ? excludeSystemIndicesAction : includeSystemIndicesAction}
          />
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiFlexGroup>
          <KuiFlexItem>
            <KuiTitle>
              <h3>Define a pattern...</h3>
            </KuiTitle>
            <KuiForm>
              <KuiFormRow
                helpText="Patterns allow you to define dynamic index names using * as a wildcard"
              >
                <KuiFlexGroup growItems={false}>
                  <KuiFlexItem>
                    <InputPatternInputField
                      placeholder="Please enter..."
                      onChange={fetchIndicesAction}
                      name="pattern"
                    />
                  </KuiFlexItem>
                  <KuiFlexItem grow={false}>
                    <KuiIcon
                      type={hasExactMatches ? 'check' : 'cross'}
                      size="medium"
                    />
                  </KuiFlexItem>
                </KuiFlexGroup>
              </KuiFormRow>
              { hasExactMatches
                ?
                  <KuiFormRow>
                    <KuiFlexGroup growItems={false}>
                      <KuiFlexItem>
                        <KuiSelect
                          placeholder="Specify an optional time field"
                          options={timeFields}
                        />
                      </KuiFlexItem>
                      <KuiFlexItem grow={false}>
                        <KuiButtonEmpty
                          iconType="lock"
                        />
                      </KuiFlexItem>
                    </KuiFlexGroup>
                  </KuiFormRow>
                : null
              }
            </KuiForm>
          </KuiFlexItem>
          { indices.length > 0
            ?
              <KuiFlexItem>
                <KuiTitle>
                  <h3>...that will match these indices</h3>
                </KuiTitle>
                <KuiTable className="kuiVerticalRhythm">
                  <KuiTableHeader>
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
                    <KuiTableHeaderCell>
                      <KuiButtonEmpty
                        onClick={() => changeSortAction('count')}
                      >
                        Doc Count
                        { sortBy === 'count'
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
                  <KuiTableBody>
                    {indexRows}
                  </KuiTableBody>
                </KuiTable>
                {filteredIndices.length > perPage
                  ?
                    <div className="kuiVerticalRhythm">
                      <KuiText>
                        <span>
                          {page}
                          &nbsp;
                          of
                          &nbsp;
                          {Math.ceil(filteredIndices.length / perPage)}
                          &nbsp;
                          &nbsp;
                        </span>
                      </KuiText>
                      <KuiIcon
                        type="arrowLeft"
                        size="medium"
                        onClick={goToPreviousPageAction}
                      />
                      <KuiIcon
                        type="arrowRight"
                        size="medium"
                        onClick={goToNextPageAction}
                      />
                    </div>
                  : null
                }
              </KuiFlexItem>
            : false
          }
        </KuiFlexGroup>
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

IndexPattern.defaultProps = {
  indices: [],
};

export default IndexPattern;

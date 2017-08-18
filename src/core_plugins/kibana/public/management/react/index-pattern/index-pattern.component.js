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
  KuiFieldText,
  KuiIcon,
  KuiTable,
  KuiTableRow,
  KuiTableRowCell,
  KuiTableHeaderCell,
  KuiTableBody,
  KuiTableHeader,
} from 'ui_framework/components';

const IndexPattern = ({
  filteredIndices,
  indices,
  page,
  perPage,
  includeSystemIndices,
  includeSystemIndicesAction,
  excludeSystemIndicesAction,
  fetchIndicesAction,
  goToNextPageAction,
  goToPreviousPageAction,
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
        <KuiTitle>
          <h3>Define a pattern...</h3>
        </KuiTitle>
        <KuiForm>
          <KuiFormRow
            helpText="Patterns allow you to define dynamic index names using * as a wildcard"
          >
            <KuiFieldText
              placeholder="Please enter..."
              onChange={(e) => fetchIndicesAction(e.target.value)}
              name="pattern"
            />
          </KuiFormRow>
        </KuiForm>
        { indices.length > 0
          ?
            <div>
              <KuiTitle>
                <h3>...that will match these indices</h3>
              </KuiTitle>
              <KuiTable className="kuiVerticalRhythm">
                <KuiTableHeader>
                  <KuiTableHeaderCell>
                    Name
                  </KuiTableHeaderCell>
                  <KuiTableHeaderCell>
                    Fields
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
                        of
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
            </div>
          : false
        }
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

IndexPattern.defaultProps = {
  indices: [],
};

export default IndexPattern;

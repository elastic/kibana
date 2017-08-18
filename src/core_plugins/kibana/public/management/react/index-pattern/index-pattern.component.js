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
  indices,
  includeSystemIndices,
  includeSystemIndicesAction,
  excludeSystemIndicesAction,
  fetchIndicesAction
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
        <KuiTitle>
          <h3>...that will match these indices</h3>
        </KuiTitle>
        <KuiTable>
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
        {indices.length > 0
          ?
            <div className="kuiVerticalRhythm">
              <KuiIcon
                type="arrowLeft"
                size="medium"
              />
              <KuiIcon
                type="arrowRight"
                size="medium"
              />
            </div>
          : null
        }
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

IndexPattern.defaultProps = {
  indices: [],
};

export default IndexPattern;

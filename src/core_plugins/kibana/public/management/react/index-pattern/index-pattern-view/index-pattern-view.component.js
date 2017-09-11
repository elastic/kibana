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
  KuiButtonIcon,
  KuiTabs,
  KuiTab,
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


const IndexPatternView = ({
  indexPattern,
}) => {
  console.log('IndexPatternView', indexPattern);
  if (indexPattern === undefined) {
    return null;
  }

  const {
    pattern,
    fields,
    timeFieldName,
  } = indexPattern;

  return (
    <KuiPageContent>
      <KuiPageContentHeader>
        <KuiPageContentHeaderSection>
          <KuiFlexGroup>
            <KuiFlexItem>
              <KuiTitle>
                <h2>{pattern}</h2>
              </KuiTitle>
            </KuiFlexItem>
            <KuiFlexItem>
              <KuiButtonEmpty>
                Set as default index
              </KuiButtonEmpty>
            </KuiFlexItem>
          </KuiFlexGroup>
        </KuiPageContentHeaderSection>
        <KuiPageContentHeaderSection>
          <KuiButtonIcon
            iconType="user"
          />
          &nbsp;
          <KuiButtonIcon
            iconType="lock"
          />
        </KuiPageContentHeaderSection>
      </KuiPageContentHeader>
      <KuiPageContentBody>
        <KuiText>
          <p>
            Configured time field: <strong>{timeFieldName}</strong>
          </p>
        </KuiText>
        <KuiText style={{ maxWidth: '75%' }}>
          <p>
            This page lists every field in the <strong>{pattern}</strong> index and the field's associated
            core type as recorded by Elasticsearch. While this list allows you to view the core type of each
            field, changing field types must be done using Elasticsearch's Mapping API.
          </p>
        </KuiText>
        <KuiTabs>
          <KuiTab

          >
            Fields ({fields.length})
          </KuiTab>
          <KuiTab

          >
            Scripted Fields (0)
          </KuiTab>
          <KuiTab

          >
            Source Filters (0)
          </KuiTab>
        </KuiTabs>
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

export default IndexPatternView;

import React from 'react';
import {
  KuiPageContent,
  KuiPageContentBody,
  KuiPageContentHeader,
  KuiPageContentHeaderSection,
  KuiTitle,
  KuiText,
  KuiButtonIcon,
  KuiTabs,
  KuiTab,
  KuiButtonEmpty,
  KuiFlexGroup,
  KuiFlexItem,
  KuiConfirmModal,
  KuiModalOverlay,
} from 'ui_framework/components';

import { IndexPatternFields } from './components/index-pattern-fields';

const IndexPatternView = ({
  pattern,
  id,
  fields,
  timeFieldName,
  isDefault,
  selectedTab,
  changeTab,
  isShowingRefreshFieldsConfirmation,
  showRefreshFieldsConfirmation,
  hideRefreshFieldsConfirmation,
  refreshFields,
  deleteIndexPattern,
  setDefaultIndexPattern,
}) => {
  if (pattern === undefined || fields === undefined) {
    return null;
  }

  let tabContent = null;
  if (selectedTab === 'fields') {
    tabContent = <IndexPatternFields fields={fields}/>;
  }

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
            { !isDefault
              ?
                <KuiFlexItem>
                  <KuiButtonEmpty onClick={() => setDefaultIndexPattern(id)}>
                    Set as default index
                  </KuiButtonEmpty>
                </KuiFlexItem>
              : null
            }
          </KuiFlexGroup>
          { isShowingRefreshFieldsConfirmation
            ?
              <KuiModalOverlay>
                <KuiConfirmModal
                  onCancel={hideRefreshFieldsConfirmation}
                  onConfirm={() => {
                    hideRefreshFieldsConfirmation();
                    refreshFields(id, pattern);
                  }}
                  confirmButtonText="Refresh Fields"
                  cancelButtonText="Cancel"
                  message="This will reset the field popularity counters. Are you sure you want to refresh your fields?"
                  title="Are you sure?"
                />
              </KuiModalOverlay>
            : null
          }

        </KuiPageContentHeaderSection>
        <KuiPageContentHeaderSection>
          <KuiButtonIcon
            iconType="faceHappy"
            onClick={showRefreshFieldsConfirmation}
          />
          &nbsp;
          <KuiButtonIcon
            iconType="trash"
            onClick={() => deleteIndexPattern(id)}
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
            This page lists every field in the <strong>{pattern}</strong> index and the field&apos;s associated
            core type as recorded by Elasticsearch. While this list allows you to view the core type of each
            field, changing field types must be done using Elasticsearch&apos;s Mapping API.
          </p>
        </KuiText>
        <KuiTabs>
          <KuiTab
            onClick={() => changeTab('fields')}
            isSelected={selectedTab === 'fields'}
          >
            Fields ({fields.length})
          </KuiTab>
          <KuiTab
            onClick={() => changeTab('scripted')}
            isSelected={selectedTab === 'scripted'}
          >
            Scripted Fields (0)
          </KuiTab>
          <KuiTab
            onClick={() => changeTab('source')}
            isSelected={selectedTab === 'source'}
          >
            Source Filters (0)
          </KuiTab>
        </KuiTabs>
        {tabContent}
      </KuiPageContentBody>
    </KuiPageContent>
  );
};

export { IndexPatternView };

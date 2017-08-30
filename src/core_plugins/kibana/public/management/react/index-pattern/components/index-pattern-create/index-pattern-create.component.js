/* eslint-disable */
import React from 'react';
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
  KuiButton,
  KuiFlexGroup,
  KuiFlexItem,
} from 'ui_framework/components';

import IndexPatternSearch from './components/index-pattern-search';
import IndexPatternTimeFields from './components/index-pattern-time-fields';
import IndexPatternResults from './components/index-pattern-results';

const IndexPatternCreate = ({
  hasExactMatches,
  isCreating,
  isIncludingSystemIndices,
  includeSystemIndices,
  excludeSystemIndices,
  createIndexPattern,
}) => {
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
            checked={isIncludingSystemIndices}
            onChange={() => isIncludingSystemIndices ? excludeSystemIndices() : includeSystemIndices()}
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
              <IndexPatternSearch/>
              { hasExactMatches
                ?
                  <div>
                    <KuiFormRow>
                      <IndexPatternTimeFields/>
                    </KuiFormRow>
                    <KuiFormRow>
                      <KuiButton
                        fill
                        isDisabled={isCreating}
                        onClick={createIndexPattern}
                      >
                        Create
                      </KuiButton>
                    </KuiFormRow>
                  </div>
                : null
              }
            </KuiForm>
          </KuiFlexItem>
          <IndexPatternResults/>
        </KuiFlexGroup>
      </KuiPageContentBody>
    </KuiPageContent>
  )
};

export default IndexPatternCreate;

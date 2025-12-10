/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiSpacer,
  EuiBadge,
  useEuiTheme,
  EuiButtonEmpty,
  EuiText,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleTypeModalProps } from './rule_type_modal';

interface TemplateListProps {
  templates: RuleTypeModalProps['templates'];
  onSelectTemplate: (templateId: string) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

interface TemplateCardProps {
  template: RuleTypeModalProps['templates'][number];
  onSelectTemplate: (templateId: string) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = React.memo(({ template, onSelectTemplate }) => {
  const { euiTheme } = useEuiTheme();

  const handleClick = useCallback(() => {
    onSelectTemplate(template.id);
  }, [onSelectTemplate, template.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectTemplate(template.id);
      }
    },
    [onSelectTemplate, template.id]
  );

  return (
    <EuiCard
      titleSize="xs"
      textAlign="left"
      hasBorder
      title={template.name}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      description=""
      style={{ marginRight: '8px', flexGrow: 0 }}
      data-test-subj={`${template.id}-SelectOption`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        {template.ruleTypeName && (
          <EuiFlexItem grow={false}>
            <EuiText
              color="subdued"
              size="xs"
              style={{ textTransform: 'uppercase', fontWeight: euiTheme.font.weight.bold }}
            >
              {template.ruleTypeName}
            </EuiText>
          </EuiFlexItem>
        )}
        {!!template.tags?.length && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {template.tags.map((t) => (
                <EuiFlexItem key={t} grow={false}>
                  <EuiBadge color="hollow">{t}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCard>
  );
});

TemplateCard.displayName = 'TemplateCard';

export const TemplateList: React.FC<TemplateListProps> = ({
  templates,
  onSelectTemplate,
  hasMore,
  onLoadMore,
  loadingMore,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      style={{
        height: '100%',
      }}
    >
      <EuiFlexItem
        style={{
          overflowY: 'auto',
          padding: `${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.xl}`,
        }}
      >
        {templates.length === 0 && (
          <EuiEmptyPrompt
            color="subdued"
            iconType="search"
            title={
              <h2>
                {i18n.translate(
                  'responseOpsRuleForm.components.ruleTypeModal.noTemplatesErrorTitle',
                  {
                    defaultMessage: 'No templates found',
                  }
                )}
              </h2>
            }
            body={
              <p>
                {i18n.translate(
                  'responseOpsRuleForm.components.ruleTypeModal.noTemplatesErrorBody',
                  {
                    defaultMessage: 'Try a different search or change your filter settings',
                  }
                )}
              </p>
            }
          />
        )}
        {templates.map((tpl) => (
          <React.Fragment key={tpl.id}>
            <TemplateCard template={tpl} onSelectTemplate={onSelectTemplate} />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}
        {hasMore && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  onClick={onLoadMore}
                  isLoading={loadingMore}
                  iconType="arrowDown"
                  data-test-subj="templateList-loadMore"
                >
                  {i18n.translate(
                    'responseOpsRuleForm.components.ruleTypeModal.loadMoreTemplatesButton',
                    {
                      defaultMessage: 'Load more',
                    }
                  )}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { ReactNode, useCallback, useMemo } from 'react';
import { orderBy } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiModalHeader,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiLink,
  EuiSpacer,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiDescriptionList,
  EuiTabs,
  EuiTab,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocLinksStart } from '@kbn/core/public';
import type { BaseVisType, TypesStart } from '../../vis_types';
import { VisGroups } from '../../vis_types/vis_groups_enum';
import type { VisTypeAlias } from '../../vis_types/vis_type_alias_registry';
import './group_selection.scss';

export interface GroupSelectionProps {
  onVisTypeSelected: (visType: BaseVisType | VisTypeAlias) => void;
  visTypesRegistry: TypesStart;
  docLinks: DocLinksStart;
  showMainDialog: (flag: boolean) => void;
  tab: 'recommended' | 'legacy';
  setTab: (tab: 'recommended' | 'legacy') => void;
}

interface VisCardProps {
  onVisTypeSelected: (visType: BaseVisType | VisTypeAlias) => void;
  visType: BaseVisType | VisTypeAlias;
  shouldStretch?: boolean;
}

const tabs: Array<{ id: 'recommended' | 'legacy'; label: ReactNode; dataTestSubj: string }> = [
  {
    id: 'recommended',
    label: i18n.translate('visualizations.newVisWizard.recommendedTab', {
      defaultMessage: 'Recommended',
    }),
    dataTestSubj: 'groupModalRecommendedTab',
  },
  {
    id: 'legacy',
    dataTestSubj: 'groupModalLegacyTab',
    label: (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {i18n.translate('visualizations.newVisWizard.legacyTab', {
            defaultMessage: 'Legacy',
          })}
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIconTip
            content={i18n.translate('visualizations.newVisWizard.legacyTabDescription', {
              defaultMessage: 'Legacy visualizations are scheduled for deprecation in the future.',
            })}
            position="top"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
];

const getVisTypesFromGroup = (
  visTypesRegistry: TypesStart,
  group: VisGroups
): Array<BaseVisType | VisTypeAlias> => {
  return visTypesRegistry.getByGroup(group).filter(({ disableCreate }) => !disableCreate);
};

function GroupSelection({
  tab = 'recommended',
  setTab,
  visTypesRegistry,
  ...props
}: GroupSelectionProps) {
  const visualizeGuideLink = props.docLinks.links.visualize.guide;
  const promotedVisGroups = useMemo(
    () =>
      orderBy(
        [
          ...visTypesRegistry.getAliases(),
          ...visTypesRegistry.getByGroup(VisGroups.PROMOTED),
        ].filter((visDefinition) => {
          return !visDefinition.disableCreate;
        }),
        ['promotion', 'title'],
        ['asc', 'asc']
      ),
    [visTypesRegistry]
  );

  const aggBasedTypes = getVisTypesFromGroup(visTypesRegistry, VisGroups.AGGBASED);
  const legacyTypes = getVisTypesFromGroup(visTypesRegistry, VisGroups.LEGACY);

  const shouldDisplayLegacyTab = legacyTypes.length + aggBasedTypes.length;

  const [tsvbProps] = legacyTypes.map((visType) => ({
    visType: {
      ...visType,
      icon: visType.name === 'metrics' ? 'visualizeApp' : (visType.icon as string),
    },
    onVisTypeSelected: props.onVisTypeSelected,
    key: visType.name,
  }));

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="groupModalHeader">
          <FormattedMessage
            id="visualizations.newVisWizard.title"
            defaultMessage="Create visualization"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="visNewVisDialogGroupSelection__body">
        {shouldDisplayLegacyTab && (
          <div className="visNewVisDialogGroupSelection__visGroups">
            <EuiTabs>
              {tabs.map((t) => (
                <EuiTab
                  data-test-subj={t.dataTestSubj}
                  isSelected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  key={t.id}
                >
                  {t.label}
                </EuiTab>
              ))}
            </EuiTabs>
          </div>
        )}

        <div className="visNewVisDialogGroupSelection__visGroups">
          <EuiSpacer size="s" />
          {tab === 'recommended' ? (
            <EuiFlexGrid columns={2} data-test-subj="visNewDialogGroups">
              {promotedVisGroups.map((visType) => (
                <VisGroup
                  visType={visType}
                  key={visType.name}
                  onVisTypeSelected={props.onVisTypeSelected}
                  shouldStretch={visType.name === 'lens'}
                />
              ))}
            </EuiFlexGrid>
          ) : (
            <EuiFlexGrid columns={2} data-test-subj="visNewDialogGroups">
              {tsvbProps ? <VisGroup {...tsvbProps} /> : null}
              {
                <VisGroup
                  visType={{
                    stage: 'production',
                    name: 'aggbased',
                    description: i18n.translate(
                      'visualizations.newVisWizard.aggBasedGroupDescription',
                      {
                        defaultMessage: 'Craft charts using basic aggregations.',
                      }
                    ),
                    icon: 'indexPatternApp',
                    title: i18n.translate('visualizations.newVisWizard.aggBasedGroupTitle', {
                      defaultMessage: 'Aggregation-based',
                    }),
                  }}
                  onVisTypeSelected={() => {
                    props.showMainDialog(false);
                  }}
                />
              }
            </EuiFlexGrid>
          )}

          <EuiSpacer size="l" />
        </div>

        <ModalFooter visualizeGuideLink={visualizeGuideLink} />
      </EuiModalBody>
    </>
  );
}

const ModalFooter = ({ visualizeGuideLink }: { visualizeGuideLink: string }) => {
  return (
    <div className="visNewVisDialogGroupSelection__footer">
      <EuiSpacer size="l" />
      <EuiDescriptionList
        className="visNewVisDialogGroupSelection__footerDescriptionList"
        type="responsiveColumn"
        compressed
      >
        <EuiDescriptionListTitle className="visNewVisDialogGroupSelection__footerDescriptionListTitle">
          <FormattedMessage
            id="visualizations.newVisWizard.learnMoreText"
            defaultMessage="Want to learn more?"
          />
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <EuiLink href={visualizeGuideLink} target="_blank" external>
            <FormattedMessage
              id="visualizations.newVisWizard.viewDocumentationLink"
              defaultMessage="View documentation"
            />
          </EuiLink>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </div>
  );
};

const VisGroup = ({ visType, onVisTypeSelected, shouldStretch = false }: VisCardProps) => {
  const onClick = useCallback(() => {
    onVisTypeSelected(visType);
  }, [onVisTypeSelected, visType]);
  return (
    <EuiFlexItem
      className="visNewVisDialog__groupsCardWrapper"
      css={shouldStretch ? { gridColumn: '1 / -1' } : null}
    >
      <EuiCard
        titleSize="xs"
        hasBorder={true}
        title={
          <span data-test-subj="visTypeTitle">
            {'titleInWizard' in visType && visType.titleInWizard
              ? visType.titleInWizard
              : visType.title}
          </span>
        }
        onClick={onClick}
        data-test-subj={`visType-${visType.name}`}
        data-vis-stage={!('alias' in visType) ? visType.stage : 'alias'}
        aria-label={`visType-${visType.name}`}
        description={
          <>
            <span>{visType.description || ''}</span>
            <em> {visType.note || ''}</em>
          </>
        }
        layout="horizontal"
        icon={<EuiIcon type={visType.icon || 'empty'} size="xl" />}
      />
    </EuiFlexItem>
  );
};

export { GroupSelection };

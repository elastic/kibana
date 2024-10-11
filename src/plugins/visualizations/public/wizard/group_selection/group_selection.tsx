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
  toggleGroups: (flag: boolean) => void;
  showExperimental: boolean;
}

interface VisCardProps {
  onVisTypeSelected: (visType: BaseVisType | VisTypeAlias) => void;
  visType: BaseVisType | VisTypeAlias;
  showExperimental?: boolean | undefined;
  shouldStretch?: boolean;
}

const tabs: Array<{ id: 'recommended' | 'legacy'; label: ReactNode; ['data-test-subj']: string }> =
  [
    {
      id: 'recommended',
      label: i18n.translate('visualizations.newVisWizard.recommendedTab', {
        defaultMessage: 'Recommended',
      }),
      ['data-test-subj']: 'groupModalRecommendedTab',
    },
    {
      id: 'legacy',
      ['data-test-subj']: 'groupModalLegacyTab',
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
                defaultMessage:
                  'Legacy visualizations are scheduled for deprecation in Kibana 9.0.',
              })}
              position="top"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

function GroupSelection(props: GroupSelectionProps) {
  const visualizeGuideLink = props.docLinks.links.dashboard.guide;
  const promotedVisGroups = useMemo(
    () =>
      orderBy(
        [
          ...props.visTypesRegistry.getAliases(),
          ...props.visTypesRegistry.getByGroup(VisGroups.PROMOTED),
          // Include so TSVB still gets displayed
          // ...props.visTypesRegistry.getByGroup(VisGroups.LEGACY),
        ].filter((visDefinition) => {
          return !visDefinition.disableCreate;
        }),
        ['promotion', 'title'],
        ['asc', 'asc']
      ),
    [props.visTypesRegistry]
  );

  const tsvbType = props.visTypesRegistry.getByGroup(VisGroups.LEGACY);
  const aggBasedTypes = props.visTypesRegistry
    .getByGroup(VisGroups.AGGBASED)
    .filter((visDefinition) => !visDefinition.disableCreate);
  const toolsTypes = props.visTypesRegistry
    .getByGroup(VisGroups.TOOLS)
    .filter(({ disableCreate }) => !disableCreate);

  const shouldDisplayLegacyTab =
    tsvbType.length > 0 || aggBasedTypes.length > 0 || toolsTypes.length > 0;

  const tsvbProps = {
    visType: { ...tsvbType[0], icon: 'visualizeApp' },
    onVisTypeSelected: props.onVisTypeSelected,
  };

  const [tab, setTab] = React.useState(tabs[0].id);

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
                  data-test-subj={t['data-test-subj']}
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
            <EuiFlexGrid columns={3} data-test-subj="visNewDialogGroups">
              <VisGroup {...tsvbProps} />
              {
                <VisGroup
                  visType={{
                    stage: 'production',
                    name: 'aggbased',
                    description: i18n.translate(
                      'visualizations.newVisWizard.aggBasedGroupDescription',
                      {
                        defaultMessage: 'Legacy library for creating charts based on aggregations.',
                      }
                    ),
                    icon: 'indexPatternApp',
                    title: i18n.translate('visualizations.newVisWizard.aggBasedGroupTitle', {
                      defaultMessage: 'Aggregation-based',
                    }),
                  }}
                  onVisTypeSelected={() => {
                    props.toggleGroups(false);
                  }}
                />
              }
              {props.visTypesRegistry
                .getByGroup(VisGroups.TOOLS)
                .filter(({ disableCreate }) => !disableCreate)
                .map((visType) => (
                  <VisGroup
                    visType={visType}
                    key={visType.name}
                    onVisTypeSelected={props.onVisTypeSelected}
                  />
                ))}
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

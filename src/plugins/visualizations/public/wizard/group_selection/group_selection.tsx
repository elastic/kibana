/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { useCallback, useMemo } from 'react';
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
  EuiText,
  EuiSpacer,
  EuiBetaBadge,
  EuiTitle,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiDescriptionList,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocLinksStart } from '../../../../../core/public';
import { VisTypeAlias } from '../../vis_types/vis_type_alias_registry';
import type { VisType, TypesStart } from '../../vis_types';
import { VisGroups } from '../../vis_types';
import './group_selection.scss';

interface GroupSelectionProps {
  onVisTypeSelected: (visType: VisType | VisTypeAlias) => void;
  visTypesRegistry: TypesStart;
  docLinks: DocLinksStart;
  toggleGroups: (flag: boolean) => void;
  showExperimental: boolean;
}

interface VisCardProps {
  onVisTypeSelected: (visType: VisType | VisTypeAlias) => void;
  visType: VisType | VisTypeAlias;
  showExperimental?: boolean | undefined;
}

function isVisTypeAlias(type: VisType | VisTypeAlias): type is VisTypeAlias {
  return 'aliasPath' in type;
}

function GroupSelection(props: GroupSelectionProps) {
  const visualizeGuideLink = props.docLinks.links.dashboard.guide;
  const promotedVisGroups = useMemo(
    () =>
      orderBy(
        [
          ...props.visTypesRegistry.getAliases(),
          ...props.visTypesRegistry.getByGroup(VisGroups.PROMOTED),
        ],
        ['promotion', 'title'],
        ['asc', 'asc']
      ),
    [props.visTypesRegistry]
  );
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="groupModalHeader">
          <FormattedMessage
            id="visualizations.newVisWizard.title"
            defaultMessage="New visualization"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="visNewVisDialogGroupSelection__body">
        <div className="visNewVisDialogGroupSelection__visGroups">
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={2} data-test-subj="visNewDialogGroups">
            {promotedVisGroups.map((visType) => (
              <VisGroup
                visType={visType}
                key={visType.name}
                onVisTypeSelected={props.onVisTypeSelected}
              />
            ))}
          </EuiFlexGrid>
          <EuiSpacer size="l" />
        </div>
        <div className="visNewVisDialogGroupSelection__footer">
          <EuiSpacer size="l" />
          <EuiFlexGrid columns={2}>
            {props.visTypesRegistry.getByGroup(VisGroups.AGGBASED).length > 0 && (
              <EuiFlexItem>
                <EuiCard
                  titleSize="xs"
                  layout="horizontal"
                  onClick={() => props.toggleGroups(false)}
                  title={
                    <span data-test-subj="visGroupAggBasedTitle">
                      {i18n.translate('visualizations.newVisWizard.aggBasedGroupTitle', {
                        defaultMessage: 'Aggregation based',
                      })}
                    </span>
                  }
                  data-test-subj="visGroup-aggbased"
                  description={i18n.translate(
                    'visualizations.newVisWizard.aggBasedGroupDescription',
                    {
                      defaultMessage:
                        'Use our classic visualize library to create charts based on aggregations.',
                    }
                  )}
                  icon={<EuiIcon type="heatmap" size="xl" color="secondary" />}
                  className="visNewVisDialog__groupsCard"
                >
                  <EuiLink
                    data-test-subj="visGroupAggBasedExploreLink"
                    onClick={() => props.toggleGroups(false)}
                  >
                    <EuiText size="s">
                      {i18n.translate('visualizations.newVisWizard.exploreOptionLinkText', {
                        defaultMessage: 'Explore options',
                      })}{' '}
                      <EuiIcon type="sortRight" />
                    </EuiText>
                  </EuiLink>
                </EuiCard>
              </EuiFlexItem>
            )}
            {props.visTypesRegistry.getByGroup(VisGroups.TOOLS).length > 0 && (
              <EuiFlexItem className="visNewVisDialog__toolsCard">
                <EuiSpacer size="m" />
                <EuiTitle size="xs">
                  <span data-test-subj="visGroup-tools">
                    {i18n.translate('visualizations.newVisWizard.toolsGroupTitle', {
                      defaultMessage: 'Tools',
                    })}
                  </span>
                </EuiTitle>
                <EuiSpacer size="s" />
                <div className="visNewVisDialog__toolsCardGroupContainer">
                  {props.visTypesRegistry.getByGroup(VisGroups.TOOLS).map((visType) => (
                    <ToolsGroup
                      visType={visType}
                      key={visType.name}
                      onVisTypeSelected={props.onVisTypeSelected}
                      showExperimental={props.showExperimental}
                    />
                  ))}
                </div>
              </EuiFlexItem>
            )}
          </EuiFlexGrid>
          <EuiSpacer size="m" />
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
                  id="visualizations.newVisWizard.readDocumentationLink"
                  defaultMessage="Read documentation"
                />
              </EuiLink>
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </div>
      </EuiModalBody>
    </>
  );
}

const VisGroup = ({ visType, onVisTypeSelected }: VisCardProps) => {
  const onClick = useCallback(() => {
    onVisTypeSelected(visType);
  }, [onVisTypeSelected, visType]);
  const shouldDisableCard = isVisTypeAlias(visType) && visType.disabled;
  const betaBadgeContent =
    shouldDisableCard && 'promoTooltip' in visType ? (
      <EuiLink
        href={visType?.promoTooltip?.link}
        target="_blank"
        color="text"
        className="visNewVisDialog__groupsCardLink"
      >
        <EuiBetaBadge
          data-test-subj="visTypeBadge"
          className="visNewVisDialog__groupsCardBetaBadge"
          label={i18n.translate('visualizations.newVisWizard.basicTitle', {
            defaultMessage: 'Basic',
          })}
          tooltipContent={visType?.promoTooltip?.description}
        />
      </EuiLink>
    ) : undefined;
  return (
    <EuiFlexItem className="visNewVisDialog__groupsCardWrapper">
      {betaBadgeContent}
      <EuiCard
        titleSize="xs"
        title={
          <span data-test-subj="visTypeTitle">
            {'titleInWizard' in visType && visType.titleInWizard
              ? visType.titleInWizard
              : visType.title}
          </span>
        }
        onClick={onClick}
        isDisabled={shouldDisableCard}
        data-test-subj={`visType-${visType.name}`}
        data-vis-stage={!('aliasPath' in visType) ? visType.stage : 'alias'}
        aria-label={`visType-${visType.name}`}
        description={
          <>
            <span>{visType.description || ''}</span>
            <em> {visType.note || ''}</em>
          </>
        }
        layout="horizontal"
        icon={<EuiIcon type={visType.icon || 'empty'} size="xl" color="secondary" />}
        className="visNewVisDialog__groupsCard"
      />
    </EuiFlexItem>
  );
};

const ToolsGroup = ({ visType, onVisTypeSelected, showExperimental }: VisCardProps) => {
  const onClick = useCallback(() => {
    onVisTypeSelected(visType);
  }, [onVisTypeSelected, visType]);
  // hide the experimental visualization if lab mode is not enabled
  if (!showExperimental && visType.stage === 'experimental') {
    return null;
  }
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type={visType.icon || 'empty'} size="l" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLink data-test-subj={`visType-${visType.name}`} onClick={onClick}>
              {'titleInWizard' in visType && visType.titleInWizard
                ? visType.titleInWizard
                : visType.title}
            </EuiLink>
          </EuiFlexItem>
          {visType.stage === 'experimental' && (
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                iconType="beaker"
                tooltipContent={i18n.translate('visualizations.newVisWizard.experimentalTooltip', {
                  defaultMessage:
                    'This visualization might be changed or removed in a future release and is not subject to the support SLA.',
                })}
                label={i18n.translate('visualizations.newVisWizard.experimentalTitle', {
                  defaultMessage: 'Experimental',
                })}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiText color="subdued" size="s">
          {visType.description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { GroupSelection };

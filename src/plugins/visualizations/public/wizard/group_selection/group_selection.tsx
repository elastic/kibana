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
import React from 'react';
import { orderBy } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiModalHeader,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiLink,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DocLinksStart } from '../../../../../core/public';
import { VisTypeAlias } from '../../vis_types/vis_type_alias_registry';
import { VisType, TypesStart } from '../../vis_types';

interface GroupSelectionProps {
  onVisTypeSelected: (visType: VisType | VisTypeAlias) => void;
  visTypesRegistry: TypesStart;
  docLinks: DocLinksStart;
  toggleGroups: (flag: boolean) => void;
}

interface VisCardProps {
  onVisTypeSelected: (visType: VisType | VisTypeAlias) => void;
  visType: VisType | VisTypeAlias;
}

function GroupSelection(props: GroupSelectionProps) {
  const visualizeGuideLink = props.docLinks.links.dashboard.guide;
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="groupModalHeader">
          <FormattedMessage
            id="visualizations.newVisWizard.title"
            defaultMessage="New Visualization"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody data-test-subj="visNewDialogGroups">
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="l">
          {orderBy(props.visTypesRegistry.getAliases(), ['title', ['asc']]).map((visType) => (
            <VisGroup
              visType={visType}
              key={visType.name}
              onVisTypeSelected={props.onVisTypeSelected}
            />
          ))}
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup gutterSize="l">
          {orderBy(props.visTypesRegistry.getByGroup('other'), ['title', ['asc']]).map(
            (visType) => (
              <VisGroup
                visType={visType}
                key={visType.name}
                onVisTypeSelected={props.onVisTypeSelected}
              />
            )
          )}
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <EuiSpacer size="xl" />
        <EuiFlexGroup gutterSize="l">
          {props.visTypesRegistry.getByGroup('aggbased').length > 0 && (
            <EuiFlexItem>
              <EuiCard
                titleSize="xs"
                layout="horizontal"
                title={
                  <span data-test-subj="visGroupAggBasedTitle">
                    {i18n.translate('visualizations.newVisWizard.aggBasedGroupTitle', {
                      defaultMessage: 'Aggregation Based',
                    })}
                  </span>
                }
                data-test-subj="visGroup-aggbased"
                aria-describedby="visGroup-aggbased"
                description={i18n.translate(
                  'visualizations.newVisWizard.aggBasedGroupDescription',
                  {
                    defaultMessage:
                      'A set of frequently used visualizations that allows you to plot aggregated data to find trends, spikes and dips you need to know about',
                  }
                )}
                icon={<EuiIcon type="snowflake" size="xl" color="secondary" />}
              >
                <EuiLink
                  data-test-subj="visGroupAggBasedExploreLink"
                  onClick={() => props.toggleGroups(false)}
                >
                  {i18n.translate('visualizations.newVisWizard.exploreOptionLinkText', {
                    defaultMessage: 'Explore Options',
                  })}{' '}
                  <EuiIcon type="arrowRight" />
                </EuiLink>
              </EuiCard>
            </EuiFlexItem>
          )}
          {props.visTypesRegistry.getByGroup('tools').length > 0 && (
            <EuiFlexItem>
              <EuiCard
                titleSize="xs"
                title={
                  <span data-test-subj="visGroup-tools">
                    {i18n.translate('visualizations.newVisWizard.toolsGroupTitle', {
                      defaultMessage: 'Tools',
                    })}
                  </span>
                }
                display="plain"
                layout="horizontal"
                description=""
                className="visNewVisDialog__toolsCard"
              >
                {props.visTypesRegistry.getByGroup('tools').map((visType) => (
                  <ToolsGroup
                    visType={visType}
                    key={visType.name}
                    onVisTypeSelected={props.onVisTypeSelected}
                  />
                ))}
              </EuiCard>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText>
              {i18n.translate('visualizations.newVisWizard.learnMoreText', {
                defaultMessage: 'Want to learn more?',
              })}{' '}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={visualizeGuideLink} target="_blank" external>
              {i18n.translate('visualizations.newVisWizard.readDocumentationLink', {
                defaultMessage: 'Read documentation',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
    </>
  );
}

const VisGroup = ({ visType, onVisTypeSelected }: VisCardProps) => {
  const onClick = () => onVisTypeSelected(visType);
  return (
    <EuiFlexItem>
      <EuiCard
        titleSize="xs"
        title={<span data-test-subj="visTypeTitle">{visType.title}</span>}
        onClick={onClick}
        isDisabled={visType.disabled}
        betaBadgeLabel={visType.disabled ? 'Basic' : undefined}
        betaBadgeTooltipContent={
          visType.disabled
            ? i18n.translate('visualizations.newVisWizard.basicLicenseRequired', {
                defaultMessage: 'This feature requires a Basic License',
              })
            : undefined
        }
        data-test-subj={`visType-${visType.name}`}
        data-vis-stage={!('aliasPath' in visType) ? visType.stage : 'alias'}
        aria-describedby={`visTypeDescription-${visType.name}`}
        description={visType.description || ''}
        layout="horizontal"
        icon={<EuiIcon type={visType.icon || 'empty'} size="xl" color="secondary" />}
      />
    </EuiFlexItem>
  );
};

const ToolsGroup = ({ visType, onVisTypeSelected }: VisCardProps) => {
  const onClick = () => onVisTypeSelected(visType);
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type={visType.icon || 'empty'} size="l" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink data-test-subj={`visType-${visType.name}`} onClick={onClick}>
          {visType.title}
        </EuiLink>
        <EuiText color="subdued" size="s">
          {visType.description}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export { GroupSelection };

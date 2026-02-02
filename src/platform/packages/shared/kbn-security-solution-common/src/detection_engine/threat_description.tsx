/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiLink,
  EuiFlexGroup,
  EuiButtonEmpty,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import type { Threats } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MitreSubTechnique, MitreTactic, MitreTechnique } from './mitre_types';
import ListTreeIcon from './assets/list_tree_icon.svg';

const threatEuiFlexGroupStyles = css`
  .euiFlexItem {
    margin-bottom: 0px;
  }
`;

const techniqueLinkItemStyles = css`
  .euiIcon {
    width: 8px;
    height: 8px;
  }
  align-self: flex-start;
`;

export interface ThreatEuiFlexGroupProps {
  threat: Threats;
  'data-test-subj'?: string;
}

const lazyMitreConfiguration = () => {
  return import(
    /* webpackChunkName: "lazy_mitre_configuration" */
    './mitre_tactics_techniques'
  );
};

export const ThreatEuiFlexGroup = ({
  threat,
  'data-test-subj': dataTestSubj = 'threat',
}: ThreatEuiFlexGroupProps) => {
  const { euiTheme } = useEuiTheme();
  const [techniquesOptions, setTechniquesOptions] = useState<MitreTechnique[]>([]);
  const [tacticsOptions, setTacticsOptions] = useState<MitreTactic[]>([]);
  const [subtechniquesOptions, setSubtechniquesOptions] = useState<MitreSubTechnique[]>([]);

  const subtechniqueFlexItemStyles = css`
    margin-left: ${euiTheme.size.m};
  `;

  useEffect(() => {
    async function getMitre() {
      const mitreModule = await lazyMitreConfiguration();
      setSubtechniquesOptions(mitreModule.subtechniques);
      setTechniquesOptions(mitreModule.techniques);
      setTacticsOptions(mitreModule.tactics);
    }
    getMitre();
  }, []);

  return (
    <EuiFlexGroup css={threatEuiFlexGroupStyles} direction="column" data-test-subj={dataTestSubj}>
      {threat.map((singleThreat, index) => {
        const tactic = tacticsOptions.find((t) => t.id === singleThreat.tactic.id);
        return (
          <EuiFlexItem key={`${singleThreat.tactic.name}-${index}`}>
            <EuiLink
              data-test-subj="threatTacticLink"
              href={singleThreat.tactic.reference}
              target="_blank"
            >
              {tactic != null
                ? tactic.label
                : `${singleThreat.tactic.name} (${singleThreat.tactic.id})`}
            </EuiLink>
            <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
              {singleThreat.technique &&
                singleThreat.technique.map((technique, techniqueIndex) => {
                  const myTechnique = techniquesOptions.find((t) => t.id === technique.id);
                  return (
                    <EuiFlexItem key={myTechnique?.id ?? techniqueIndex}>
                      <EuiButtonEmpty
                        css={techniqueLinkItemStyles}
                        data-test-subj="threatTechniqueLink"
                        href={technique.reference}
                        target="_blank"
                        iconType={ListTreeIcon}
                        size="xs"
                      >
                        {myTechnique != null
                          ? myTechnique.label
                          : `${technique.name} (${technique.id})`}
                      </EuiButtonEmpty>
                      <EuiFlexGroup gutterSize="none" alignItems="flexStart" direction="column">
                        {technique.subtechnique != null &&
                          technique.subtechnique.map((subtechnique, subtechniqueIndex) => {
                            const mySubtechnique = subtechniquesOptions.find(
                              (t) => t.id === subtechnique.id
                            );
                            return (
                              <EuiFlexItem
                                key={mySubtechnique?.id ?? subtechniqueIndex}
                                css={subtechniqueFlexItemStyles}
                              >
                                <EuiButtonEmpty
                                  css={techniqueLinkItemStyles}
                                  data-test-subj="threatSubtechniqueLink"
                                  href={subtechnique.reference}
                                  target="_blank"
                                  iconType={ListTreeIcon}
                                  size="xs"
                                >
                                  {mySubtechnique != null
                                    ? mySubtechnique.label
                                    : `${subtechnique.name} (${subtechnique.id})`}
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                            );
                          })}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  );
                })}
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface IngestionPanelProps {
  additionalIngestionPanel?: React.ReactNode;
  docLinks: { beats: string; logstash: string };
}

export const IngestionsPanel: React.FC<IngestionPanelProps> = ({
  additionalIngestionPanel,
  docLinks,
}) => {
  const panels = [
    {
      description: i18n.translate(
        'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.logstashDescription',
        {
          defaultMessage:
            'General-purpose data processing pipeline for Elasticsearch. Use Logstash to extract and transform data from a variety of inputs and outputs.',
        }
      ),
      title: i18n.translate(
        'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.logstashTitle',
        {
          defaultMessage: 'Logstash',
        }
      ),
      links: [
        {
          href: docLinks.logstash,
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.logstashDocumentationLabel',
            {
              defaultMessage: 'Documentation',
            }
          ),

          external: true,
        },
        {
          href: 'https://github.com/elastic/logstash',
          icon: 'logoGithub',
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.logstashGithubLabel',
            {
              defaultMessage: 'logstash',
            }
          ),
        },
      ],
    },
    {
      description: i18n.translate(
        'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.beatsDescription',
        {
          defaultMessage:
            'Lightweight, single-purpose data shippers for Elasticsearch. Use Beats to send operational data from your servers.',
        }
      ),
      title: i18n.translate(
        'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.beatsTitle',
        {
          defaultMessage: 'Beats',
        }
      ),
      links: [
        {
          href: docLinks.beats,
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.BeatsDocumentationLabel',
            {
              defaultMessage: 'Documentation',
            }
          ),
          external: true,
        },
        {
          href: 'https://github.com/elastic/beats',
          icon: 'logoGithub',
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.BeatsGithubLabel',
            {
              defaultMessage: 'Beats',
            }
          ),
        },
      ],
    },
  ];
  return (
    <>
      {additionalIngestionPanel}
      {panels.map(({ title, description, links }) => (
        <EuiFlexGroup direction="column" justifyContent="spaceEvenly" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h6>{title}</h6>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText>
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
          {links && links.length > 0 && (
            <>
              <EuiFlexGroup direction="row" justifyContent="flexStart" alignItems="center">
                {links.map(({ label, href, external, icon }, index) => (
                  <EuiFlexItem grow={false}>
                    <EuiLink href={href} key={index} external={external}>
                      {icon ? (
                        <EuiButtonEmpty color="primary" iconType={icon} size="s">
                          {label}
                        </EuiButtonEmpty>
                      ) : (
                        label
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}
        </EuiFlexGroup>
      ))}
    </>
  );
};

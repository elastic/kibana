/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GithubLink } from './github_link';

interface IngestionPanelProps {
  additionalIngestionPanel?: React.ReactNode;
  docLinks: { beats: string; logstash: string };
  assetBasePath: string;
}

export const IngestionsPanel: React.FC<IngestionPanelProps> = ({
  additionalIngestionPanel,
  docLinks,
  assetBasePath,
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
          ariaLabel: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.logstashDocumentation.ariaLabel',
            {
              defaultMessage: 'Logstash documentation',
            }
          ),
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.logstashDocumentationLabel',
            {
              defaultMessage: 'Documentation',
            }
          ),
        },
        {
          href: 'https://github.com/elastic/logstash',
          isGithubLink: true,
          label: 'logstash',
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
          ariaLabel: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.beatsDocumentation.ariaLabel',
            {
              defaultMessage: 'Beats documentation',
            }
          ),
          label: i18n.translate(
            'searchApiPanels.welcomeBanner.ingestData.alternativeOptions.beatsDocumentationLabel',
            {
              defaultMessage: 'Documentation',
            }
          ),
        },
        {
          href: 'https://github.com/elastic/beats',
          isGithubLink: true,
          label: 'beats',
        },
      ],
    },
  ];
  return (
    <>
      {additionalIngestionPanel}
      {panels.map(({ title, description, links }, panelIndex) => (
        <EuiFlexGroup
          direction="column"
          justifyContent="spaceEvenly"
          gutterSize="s"
          key={panelIndex}
        >
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
                {links.map(({ label, href, isGithubLink, ariaLabel }, linksIndex) => (
                  <EuiFlexItem grow={false} key={linksIndex}>
                    {isGithubLink ? (
                      <GithubLink
                        href={href}
                        label={label}
                        assetBasePath={assetBasePath}
                        aria-label={ariaLabel}
                      />
                    ) : (
                      <EuiLink aria-label={ariaLabel} href={href} target="_blank">
                        {label}
                      </EuiLink>
                    )}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiCollapsibleNavGroup, EuiLink } from '@elastic/eui';
import React, { FC } from 'react';
import { getI18nStrings } from '../../i18n_strings';

const i18nTexts = getI18nStrings();

const presets = {
  projects: {
    href: 'https://cloud.elastic.co/projects',
    icon: 'spaces',
    title: i18nTexts.linkToCloudProjects,
    dataTestSubj: 'nav-header-link-to-projects',
  },
  deployments: {
    href: 'https://cloud.elastic.co/deployments',
    icon: 'spaces',
    title: i18nTexts.linkToCloudDeployments,
    dataTestSubj: 'nav-header-link-to-deployments',
  },
};

export interface Props {
  /** Use one of the cloud link presets */
  preset?: 'projects' | 'deployments' | null;
  /** Optional. If "preset" is not provided it is required */
  href?: string;
  /** Optional. If "preset" is not provided it is required */
  icon?: string;
  /** Optional. If "preset" is not provided it is required */
  title?: string;
}

export const CloudLink: FC<Props> = ({ preset, href: _href, icon: _icon, title: _title }) => {
  if (preset === null) {
    return null;
  }

  if (!preset && (!_href || !_icon || !_title)) {
    throw new Error(`Navigation.CloudLink requires href, icon, and title`);
  }

  const { href, icon, title, dataTestSubj } =
    preset && presets[preset]
      ? presets[preset]!
      : {
          href: _href,
          icon: _icon,
          title: _title,
          dataTestSubj: 'nav-header-link-to-cloud',
        };

  return (
    <EuiLink href={href} color="text" data-test-subj={dataTestSubj}>
      <EuiCollapsibleNavGroup iconType={icon} title={title} />
    </EuiLink>
  );
};

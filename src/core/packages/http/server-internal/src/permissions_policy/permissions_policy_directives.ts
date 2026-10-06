/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PermissionsPolicyConfigType, PermissionsPolicyDirectiveSetting } from './config';
import { permissionsPolicyDirectiveSettings } from './config';

export type PermissionsPolicyDirectiveName =
  | 'camera'
  | 'display-capture'
  | 'fullscreen'
  | 'geolocation'
  | 'microphone'
  | 'web-share';

/**
 * The default directive rules that are always applied. Insertion order is the serialization order,
 * and reproduces the policy Kibana has sent since 8.x.
 */
export const defaultRules: Record<PermissionsPolicyDirectiveName, string[]> = {
  camera: [],
  'display-capture': [],
  fullscreen: ['self'],
  geolocation: [],
  microphone: [],
  'web-share': [],
};

/** Maps a `permissionsPolicy.*` configuration key to its Permissions-Policy directive name. */
const settingToDirective: Record<
  PermissionsPolicyDirectiveSetting,
  PermissionsPolicyDirectiveName
> = {
  camera: 'camera',
  display_capture: 'display-capture',
  fullscreen: 'fullscreen',
  geolocation: 'geolocation',
  microphone: 'microphone',
  web_share: 'web-share',
};

/**
 * Tokens that are serialized bare. Every other value is an origin and is double-quoted.
 * See https://www.w3.org/TR/permissions-policy/
 */
const bareTokens = ['self', 'src', '*'];

const normalizeDirectiveValue = (value: string) => {
  if (bareTokens.includes(value)) {
    return value;
  }
  // Already-quoted values are passed through so the serializer stays idempotent.
  if (value.startsWith('"') && value.endsWith('"')) {
    return value;
  }
  return `"${value}"`;
};

export class PermissionsPolicyDirectives {
  private readonly directives = new Map<PermissionsPolicyDirectiveName, Set<string>>();
  private readonly reportOnlyDirectives = new Map<PermissionsPolicyDirectiveName, Set<string>>();

  addDirectiveValue(
    directiveName: PermissionsPolicyDirectiveName,
    directiveValue: string,
    enforce = true
  ) {
    const directivesMap = enforce ? this.directives : this.reportOnlyDirectives;

    let directive = directivesMap.get(directiveName);
    if (!directive) {
      directivesMap.set(directiveName, (directive = new Set()));
    }

    directive.add(normalizeDirectiveValue(directiveValue));
  }

  /** Creates the directive entry even when the allowlist is empty, so it serializes as `name=()`. */
  private ensureDirective(directiveName: PermissionsPolicyDirectiveName, enforce = true) {
    const directivesMap = enforce ? this.directives : this.reportOnlyDirectives;
    if (!directivesMap.has(directiveName)) {
      directivesMap.set(directiveName, new Set());
    }
  }

  getPermissionsPolicyHeadersByDisposition(reportTo?: string) {
    return {
      enforceHeader: this.headerFromDirectives(this.directives, reportTo),
      reportOnlyHeader: this.headerFromDirectives(this.reportOnlyDirectives, reportTo),
    };
  }

  private headerFromDirectives(
    directives: Map<PermissionsPolicyDirectiveName, Set<string>>,
    reportTo?: string
  ): string {
    // The `report-to` parameter applies to the member it is attached to, not to the whole header,
    // so it is repeated on every directive. See https://www.w3.org/TR/permissions-policy/
    const parameter = reportTo ? `;report-to=${reportTo}` : '';

    return [...directives.entries()]
      .map(([name, values]) => {
        // `*` means every origin, and is only meaningful on its own.
        const allowlist = values.has('*') ? '*' : `(${[...values].join(' ')})`;
        return `${name}=${allowlist}${parameter}`;
      })
      .join(', ');
  }

  static fromConfig(config: PermissionsPolicyConfigType): PermissionsPolicyDirectives {
    const permissionsPolicyDirectives = new PermissionsPolicyDirectives();

    // Kibana's own defaults come first, so an administrator's values are added to them.
    Object.entries(defaultRules).forEach(([directiveName, values]) => {
      permissionsPolicyDirectives.ensureDirective(directiveName as PermissionsPolicyDirectiveName);
      values.forEach((value) => {
        permissionsPolicyDirectives.addDirectiveValue(
          directiveName as PermissionsPolicyDirectiveName,
          value
        );
      });
    });

    permissionsPolicyDirectiveSettings.forEach((setting) => {
      const directiveName = settingToDirective[setting];

      config[setting]?.forEach((value) => {
        permissionsPolicyDirectives.addDirectiveValue(directiveName, value);
      });

      const reportOnlyValues = config.report_only?.[setting];
      if (reportOnlyValues?.length) {
        permissionsPolicyDirectives.ensureDirective(directiveName, false);
        reportOnlyValues.forEach((value) => {
          permissionsPolicyDirectives.addDirectiveValue(directiveName, value, false);
        });
      }
    });

    return permissionsPolicyDirectives;
  }
}

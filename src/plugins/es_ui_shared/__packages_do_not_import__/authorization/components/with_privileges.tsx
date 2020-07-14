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

import { MissingPrivileges } from '../types';

import { useAuthorizationContext } from './authorization_provider';

interface Props {
  /**
   * Each required privilege must have the format "section.privilege".
   * To indicate that *all* privileges from a section are required, we can use the asterix
   * e.g. "index.*"
   */
  privileges: string | string[];
  children: (childrenProps: {
    isLoading: boolean;
    hasPrivileges: boolean;
    privilegesMissing: MissingPrivileges;
  }) => JSX.Element;
}

type Privilege = [string, string];

const toArray = (value: string | string[]): string[] =>
  Array.isArray(value) ? (value as string[]) : ([value] as string[]);

export const WithPrivileges = ({ privileges: requiredPrivileges, children }: Props) => {
  const { isLoading, privileges } = useAuthorizationContext();

  const privilegesToArray: Privilege[] = toArray(requiredPrivileges).map((p) => {
    const [section, privilege] = p.split('.');
    if (!privilege) {
      // Oh! we forgot to use the dot "." notation.
      throw new Error('Required privilege must have the format "section.privilege"');
    }
    return [section, privilege];
  });

  const hasPrivileges = isLoading
    ? false
    : privilegesToArray.every((privilege) => {
        const [section, requiredPrivilege] = privilege;
        if (!privileges.missingPrivileges[section]) {
          // if the section does not exist in our missingPriviledges, everything is OK
          return true;
        }
        if (privileges.missingPrivileges[section]!.length === 0) {
          return true;
        }
        if (requiredPrivilege === '*') {
          // If length > 0 and we require them all... KO
          return false;
        }
        // If we require _some_ privilege, we make sure that the one
        // we require is *not* in the missingPrivilege array
        return !privileges.missingPrivileges[section]!.includes(requiredPrivilege);
      });

  const privilegesMissing = privilegesToArray.reduce((acc, [section, privilege]) => {
    if (privilege === '*') {
      acc[section] = privileges.missingPrivileges[section] || [];
    } else if (
      privileges.missingPrivileges[section] &&
      privileges.missingPrivileges[section]!.includes(privilege)
    ) {
      const missing: string[] = acc[section] || [];
      acc[section] = [...missing, privilege];
    }

    return acc;
  }, {} as MissingPrivileges);

  return children({ isLoading, hasPrivileges, privilegesMissing });
};

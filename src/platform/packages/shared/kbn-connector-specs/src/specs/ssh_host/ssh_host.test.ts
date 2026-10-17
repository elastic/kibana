/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from '../../all_specs';
import { getConnectorSpec } from '../../get_connector_spec';
import { SshHost } from './ssh_host';

describe('SSH Host connector spec', () => {
  it('is visible to Agent Builder without being registered as a second connector type', () => {
    expect(getConnectorSpec('.ssh')).toBe(SshHost);
    expect(Object.values(connectorsSpecs).some((spec) => spec.metadata.id === '.ssh')).toBe(false);
  });

  it('exposes the stack connector sub-actions as agent tools', () => {
    const toolActions = Object.entries(SshHost.actions)
      .filter(([, action]) => action.isTool)
      .map(([name]) => name);

    expect(toolActions).toEqual(['exec', 'uploadFile', 'downloadFile']);
  });

  describe('skill', () => {
    it('is a string that names each sub-action and the SSH client failure', () => {
      expect(typeof SshHost.skill).toBe('string');
      expect(SshHost.skill).toContain('exec');
      expect(SshHost.skill).toContain('uploadFile');
      expect(SshHost.skill).toContain('downloadFile');
      expect(SshHost.skill).toContain('255');
      expect(SshHost.skill).toContain('base64');
      expect(SshHost.skill).toContain('ssh.run');
    });
  });
});

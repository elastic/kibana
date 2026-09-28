/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentBuilderPluginStart, AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import {
  ACTIVITY_INVESTIGATION_AGENT_ID,
  ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE,
} from '../../common/agent_builder';
import { registerActivityInvestigationAttachmentUi } from './register_activity_investigation_ui';

const setup = () => {
  const definitions: AttachmentUIDefinition[] = [];
  const addAttachmentType = jest.fn((_type: string, ui: AttachmentUIDefinition) => {
    definitions.push(ui);
  });
  registerActivityInvestigationAttachmentUi({
    attachments: { addAttachmentType },
  } as AgentBuilderPluginStart);
  const definition = definitions[0];
  if (!definition?.getActionButtons) throw new Error('Missing investigation action');
  const sendMessage = jest.fn();
  return {
    addAttachmentType,
    getActionButtons: definition.getActionButtons,
    params: {
      attachment: { id: 'frozen-snapshot', type: ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE, data: {} },
      agentId: ACTIVITY_INVESTIGATION_AGENT_ID,
      isSidebar: true,
      isCanvas: false,
      updateOrigin: jest.fn(),
      sendMessage,
    },
  };
};

describe('activity investigation follow-up action', () => {
  it('sends an explicit request bound to the displayed snapshot only after a click', () => {
    const { getActionButtons, params } = setup();
    const actions = getActionButtons(params);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ label: 'Investigate more', disabled: false });
    expect(params.sendMessage).not.toHaveBeenCalled();
    actions[0].handler();
    expect(params.sendMessage).toHaveBeenCalledWith(expect.stringContaining('frozen-snapshot'));
    expect(params.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('same query, filters and metric')
    );
  });

  it('disables the action when the conversation cannot accept a message', () => {
    const { getActionButtons, params } = setup();
    const actions = getActionButtons({ ...params, sendMessage: undefined });
    expect(actions[0].disabled).toBe(true);
    actions[0].handler();
    expect(params.sendMessage).not.toHaveBeenCalled();
  });

  it('does not offer the action in another agent or the canvas', () => {
    const { getActionButtons, params } = setup();
    expect(getActionButtons({ ...params, agentId: 'another-agent' })).toEqual([]);
    expect(getActionButtons({ ...params, isCanvas: true })).toEqual([]);
  });
});

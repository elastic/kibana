/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { defineAssembly } from '@kbn/content-list-assembly';
import type { DeclarativeComponent, ParsedPart } from '@kbn/content-list-assembly';

export interface ActionBarContext {
  isSaving?: boolean;
  readOnly?: boolean;
}

export interface SaveActionProps {
  onClick?: () => void;
}

export interface DeleteActionProps {
  onClick?: () => void;
}

export interface HelpActionProps {
  href?: string;
}

export interface CustomActionProps {
  id: string;
  label: string;
  iconType?: string;
  onClick?: () => void;
}

interface ActionPresets {
  save: SaveActionProps;
  delete: DeleteActionProps;
  help: HelpActionProps;
}

const actionBarAssembly = defineAssembly({ name: 'DocsActionBar' });
const actionPart = actionBarAssembly.definePart<ActionPresets, ReactNode, ActionBarContext>({
  name: 'action',
});

const CustomAction = actionPart.createComponent<CustomActionProps>({
  resolve: ({ label, iconType, onClick }) => (
    <EuiButtonEmpty iconType={iconType} onClick={onClick}>
      {label}
    </EuiButtonEmpty>
  ),
});

const SaveAction = actionPart.createPreset({
  name: 'save',
  resolve: ({ onClick }, { isSaving = false, readOnly = false }) => (
    <EuiButton fill iconType="save" isLoading={isSaving} isDisabled={readOnly} onClick={onClick}>
      Save
    </EuiButton>
  ),
});

const DeleteAction = actionPart.createPreset({
  name: 'delete',
  resolve: ({ onClick }, { readOnly = false }) => (
    <EuiButtonEmpty color="danger" iconType="trash" isDisabled={readOnly} onClick={onClick}>
      Delete
    </EuiButtonEmpty>
  ),
});

const HelpAction = actionPart.createPreset({
  name: 'help',
  resolve: ({ href }) => (
    <EuiButtonEmpty iconType="question" href={href}>
      Help
    </EuiButtonEmpty>
  ),
});

const ExternalHelp: DeclarativeComponent<HelpActionProps> = () => null;
actionPart.tagComponent(ExternalHelp, { preset: 'help' });

export const Action = Object.assign(CustomAction, {
  Save: SaveAction,
  Delete: DeleteAction,
  Help: HelpAction,
  ExternalHelp,
});

export type ActionBarProps = PropsWithChildren<ActionBarContext>;

export const ActionBar = ({ children, isSaving, readOnly }: ActionBarProps) => {
  const actions = actionPart.parseChildren(children);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      {actions.map((action) => {
        const resolved = actionPart.resolve(action, { isSaving, readOnly });
        return resolved ? (
          <EuiFlexItem key={action.instanceId} grow={false}>
            {resolved}
          </EuiFlexItem>
        ) : null;
      })}
    </EuiFlexGroup>
  );
};

export const parseActionChildren = (children: ReactNode): ParsedPart[] =>
  actionPart.parseChildren(children);

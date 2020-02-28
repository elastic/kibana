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

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

// TODO:
// import './index.scss';

// import { Action } from '../../actions';
// don't use external interface for now. not sure if it is stabilized

export interface ActionFactoryWizardProps<Config, Context = void> {
  /**
   * Context represents environment where this component is being rendered.
   */
  context: Context;

  /**
   * Current (latest) config of the item.
   */
  config: Config | null;

  /**
   * Callback called when user updates the config in UI.
   */
  onConfig: (config: Config | null) => void;
}

export interface ActionFactory<Config, Context = null> {
  type: string;
  displayName: string;
  iconType?: string;
  context: Context;
  wizard: React.FC<ActionFactoryWizardProps<Config, Context>>;
}

export interface ActionFactoryPickerProps {
  actionFactories: Array<ActionFactory<unknown, unknown>>;
  onActionFactoryPicked: (actionFactory: ActionFactory<unknown, unknown>) => void;
}

export interface SelectedActionFactoryProps<Config = unknown> {
  actionFactory: ActionFactory<Config, unknown>;
  onConfigChange: (config: Config | null) => void;
  showDeselect: boolean;
  onDeselect: () => void;
}
export interface ActionWizardProps<Config = unknown> {
  actionFactories: Array<ActionFactory<any, unknown>>;
  onChange: (actionFactory: ActionFactory<Config, unknown> | null, config: Config | null) => void;
}

export const SelectedActionFactory: React.FC<SelectedActionFactoryProps> = ({
  actionFactory,
  onDeselect,
  showDeselect,
  onConfigChange,
}) => {
  const [config, setConfig] = useState();
  return (
    <div
      className="uiActions__selectedActionFactoryContainer"
      style={{ backgroundColor: '#f5f7fa', padding: '16px' }}
    >
      <header>
        <EuiFlexGroup alignItems="center">
          {actionFactory.iconType && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionFactory.iconType} size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>{actionFactory.displayName}</h4>
            </EuiText>
          </EuiFlexItem>
          {showDeselect && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={() => onDeselect()}>
                change
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </header>
      <EuiSpacer size="m" />
      <div>
        {actionFactory.wizard({
          context: actionFactory.context,
          config,
          onConfig: newConfig => {
            setConfig(newConfig);
            onConfigChange(newConfig);
          },
        })}
      </div>
    </div>
  );
};

export const ActionFactoryPicker: React.FC<ActionFactoryPickerProps> = ({
  actionFactories,
  onActionFactoryPicked,
}) => {
  if (actionFactories.length === 0) return <div>No action factories to pick from :(</div>;

  return (
    <EuiFlexGroup>
      {actionFactories.map(actionFactory => (
        <EuiFlexItem
          grow={false}
          key={actionFactory.type}
          style={{ width: '120px', minHeight: '100px' }}
        >
          <EuiPanel
            onClick={() => onActionFactoryPicked(actionFactory)}
            className="eui-textCenter"
            paddingSize="s"
          >
            {actionFactory.iconType && (
              <>
                <EuiIcon type={actionFactory.iconType} size="m" />
                <EuiSpacer size="s" />
              </>
            )}
            <EuiText size="xs">
              <h4>{actionFactory.displayName}</h4>
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const ActionWizard: React.FC<ActionWizardProps> = ({ actionFactories, onChange }) => {
  // eslint-disable-next-line prefer-const
  let [selectedActionFactory, setSelectedActionFactory] = useState<ActionFactory<
    unknown,
    unknown
  > | null>(null);

  // auto pick action factory if there is only 1 available
  if (!selectedActionFactory && actionFactories.length === 1) {
    selectedActionFactory = actionFactories[0];
  }

  if (selectedActionFactory) {
    return (
      <SelectedActionFactory
        actionFactory={selectedActionFactory}
        showDeselect={actionFactories.length > 1}
        onDeselect={() => {
          setSelectedActionFactory(null);
          onChange(null, null);
        }}
        onConfigChange={newConfig => {
          onChange(selectedActionFactory, newConfig);
        }}
      />
    );
  }

  return (
    <ActionFactoryPicker
      actionFactories={actionFactories}
      onActionFactoryPicked={actionFactory => {
        setSelectedActionFactory(actionFactory);
        onChange(actionFactory, null);
      }}
    />
  );
};

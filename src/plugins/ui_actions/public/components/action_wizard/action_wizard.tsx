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
import { txtChangeButton } from './i18n';
import './index.scss';

// TODO: this interface is temporary for just moving forward with the component
// and it will be imported from the ../ui_actions when implemented properly
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ActionFactoryBaseConfig = {};
export interface ActionFactory<
  Config extends ActionFactoryBaseConfig = ActionFactoryBaseConfig,
  Context = unknown
> {
  type: string;
  displayName: string;
  iconType?: string;
  wizard: React.FC<ActionFactoryWizardProps<Config, Context>>;
  context: Context;
}

export interface ActionFactoryWizardProps<
  Config extends ActionFactoryBaseConfig = ActionFactoryBaseConfig,
  Context = unknown
> {
  /**
   * Context represents environment where this component is being rendered.
   */
  context: Context;

  /**
   * Current (latest) config of the item. (state)
   */
  config: Config | null;

  /**
   * Callback called when user updates the config in UI.
   * ActionFactory's wizard should do validations to the user's input
   * In case input is complete and valid - config: Config object should be emitted
   * In case input has changed to the invalid state: null should be emitted
   */
  onConfig: (config: Config | null) => void;
}

export interface ActionWizardProps {
  /**
   * List of available action factories
   */
  actionFactories: ActionFactory[];

  /**
   * Notifies when wizard's state changes because of user's interaction
   *
   * @param actionFactory - current selected action factory. null if none is selected
   * @param config - current config for current action factory. null if no action factory or if wizard's inputs are invalid or incomplete
   */
  onChange: (actionFactory: ActionFactory | null, config: ActionFactoryBaseConfig | null) => void;
}
export const ActionWizard: React.FC<ActionWizardProps> = ({ actionFactories, onChange }) => {
  // eslint-disable-next-line prefer-const
  let [selectedActionFactory, setSelectedActionFactory] = useState<ActionFactory | null>(null);

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
    <ActionFactorySelector
      actionFactories={actionFactories}
      onActionFactorySelected={actionFactory => {
        setSelectedActionFactory(actionFactory);
        onChange(actionFactory, null);
      }}
    />
  );
};

interface SelectedActionFactoryProps<
  Config extends ActionFactoryBaseConfig = ActionFactoryBaseConfig,
  Context = unknown
> {
  actionFactory: ActionFactory<Config, Context>;
  onConfigChange: (config: Config | null) => void;
  showDeselect: boolean;
  onDeselect: () => void;
}
export const TEST_SUBJ_SELECTED_ACTION_FACTORY = 'selected-action-factory';
const SelectedActionFactory: React.FC<SelectedActionFactoryProps> = ({
  actionFactory,
  onDeselect,
  showDeselect,
  onConfigChange,
}) => {
  const [config, setConfig] = useState<ActionFactoryBaseConfig | null>(null);
  return (
    <div
      className="uiActions__selectedActionFactoryContainer"
      data-test-subj={TEST_SUBJ_SELECTED_ACTION_FACTORY}
    >
      <header>
        <EuiFlexGroup alignItems="center" gutterSize="s">
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
                {txtChangeButton}
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

interface ActionFactorySelectorProps {
  actionFactories: ActionFactory[];
  onActionFactorySelected: (actionFactory: ActionFactory) => void;
}
export const TEST_SUBJ_ACTION_FACTORY_ITEM = 'action-factory-item';
const ActionFactorySelector: React.FC<ActionFactorySelectorProps> = ({
  actionFactories,
  onActionFactorySelected,
}) => {
  if (actionFactories.length === 0) {
    // this is not user facing, as it would be impossible to get into this state
    // just leaving for dev purposes for troubleshooting
    return <div>No action factories to pick from</div>;
  }

  return (
    <EuiFlexGroup wrap={true}>
      {actionFactories.map(actionFactory => (
        <EuiFlexItem
          className="uiActions__ActionFactory"
          grow={false}
          key={actionFactory.type}
          data-test-subj={TEST_SUBJ_ACTION_FACTORY_ITEM}
        >
          <EuiPanel
            onClick={() => onActionFactorySelected(actionFactory)}
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

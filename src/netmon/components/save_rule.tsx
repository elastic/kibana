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

import React, { useReducer } from 'react';
import _ from 'lodash';
import {
  EuiButton,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextColor,
  EuiOverlayMask,
} from '@elastic/eui';
import { getTriggerCount, save as saveQueryRule, QueryRule } from '../services/query_rules';
import { SaveRuleForm, SaveRuleFormDataValidation } from './save_rule_form';

const validateForm = (value: QueryRule | null): SaveRuleFormDataValidation | null => {
  const validation = {
    id: !!value && !!value.id,
    severity: !!value && _.contains(['low', 'medium', 'high'], value.severity),
    query: !!value && !!value.query,
  };

  return _.every(Object.values(validation), v => v) ? null : validation;
};

export type SaveRuleAction =
  | {
      type: 'START_SAVE_RULE';
      query: string;
    }
  | {
      type: 'CANCEL_SAVE_RULE' | 'DATA_SUBMITTED' | 'LOOKUP_START';
    }
  | {
      type: 'UPDATE_RULE_DATA';
      ruleData: QueryRule;
    }
  | {
      type: 'CHECK_TRIGGER_COUNT_FINISH';
      triggerCount: number | null;
    }
  | {
      type: 'SAVE_RULE_FINISH';
      success: boolean;
    };

export interface SaveRuleState {
  dataSubmitted: boolean;
  loading: boolean;
  saveRuleData: QueryRule | null;
  saveSuccess: boolean | null;
  triggerCount: number | null;
}

const reducer = (state: SaveRuleState, action: SaveRuleAction): SaveRuleState => {
  let mergeData: Partial<SaveRuleState> = {};
  switch (action.type) {
    case 'START_SAVE_RULE':
      mergeData = {
        dataSubmitted: false,
        loading: false,
        saveRuleData: {
          id: '',
          severity: '',
          query: action.query,
        },
        saveSuccess: null,
        triggerCount: null,
      };
      break;
    case 'CANCEL_SAVE_RULE':
      mergeData = {
        dataSubmitted: false,
        loading: false,
        saveRuleData: null,
        saveSuccess: null,
        triggerCount: null,
      };
      break;
    case 'UPDATE_RULE_DATA':
      mergeData = {
        saveRuleData: action.ruleData,
      };
      break;
    case 'DATA_SUBMITTED':
      mergeData = {
        dataSubmitted: true,
      };
    case 'LOOKUP_START':
      mergeData = {
        loading: true,
      };
      break;
    case 'CHECK_TRIGGER_COUNT_FINISH':
      mergeData = {
        loading: false,
        triggerCount: action.triggerCount,
      };
      break;
    case 'SAVE_RULE_FINISH':
      mergeData = {
        loading: false,
        saveSuccess: action.success,
      };
      break;
  }

  return {
    ...state,
    ...mergeData,
  };
};

export interface SaveRuleProps {
  query: string;
}

export const SaveRule = (props: SaveRuleProps) => {
  const { query } = props;

  const [state, dispatch] = useReducer(reducer, {
    dataSubmitted: false,
    loading: false,
    saveRuleData: null,
    saveSuccess: null,
    triggerCount: null,
  });

  const { dataSubmitted, loading, saveRuleData, saveSuccess, triggerCount } = state;

  const startSaveRule = () => dispatch({ type: 'START_SAVE_RULE', query });

  const cancelSaveRule = () => {
    if (loading) {
      return;
    }

    dispatch({ type: 'CANCEL_SAVE_RULE' });
  };

  const submitRuleToSave = () => {
    dispatch({ type: 'DATA_SUBMITTED' });

    const validation = validateForm(saveRuleData);

    if (!saveRuleData || validation) {
      return;
    }

    dispatch({ type: 'LOOKUP_START' });

    getTriggerCount(saveRuleData.query)
      .then(triggerCountRes => {
        dispatch({ type: 'CHECK_TRIGGER_COUNT_FINISH', triggerCount: triggerCountRes });
      })
      .catch(err => {
        console.error( // eslint-disable-line
          `An error occurred checking the trigger count for query '${saveRuleData.query}'`,
          err
        );
        dispatch({ type: 'CHECK_TRIGGER_COUNT_FINISH', triggerCount: null });
      });
  };

  const saveRule = () => {
    dispatch({ type: 'LOOKUP_START' });

    if (!saveRuleData) {
      return;
    }

    saveQueryRule(saveRuleData)
      .then(() => {
        dispatch({ type: 'SAVE_RULE_FINISH', success: true });
      })
      .catch(err => {
        console.error(`An error occurred saving query rule '${saveRuleData.id}'`, err); // eslint-disable-line
        dispatch({ type: 'SAVE_RULE_FINISH', success: false });
      });
  };

  const rawValidation = validateForm(saveRuleData);
  const validation = dataSubmitted ? rawValidation : null;

  const handleModalConfirm = triggerCount === null ? submitRuleToSave : saveRule;

  const modal = !!saveRuleData && (
    <EuiOverlayMask>
      <EuiModal onClose={cancelSaveRule}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <EuiTextColor color={saveSuccess === false ? 'danger' : 'default'}>
              {saveSuccess === null && 'Create Rule'}
              {saveSuccess === true && 'Save Complete'}
              {saveSuccess === false && 'Save Failed'}
            </EuiTextColor>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          {triggerCount === null && saveSuccess === null && !loading && (
            <SaveRuleForm
              value={saveRuleData}
              onChange={val => {
                dispatch({ type: 'UPDATE_RULE_DATA', ruleData: val });
              }}
              validation={validation}
            />
          )}
          {triggerCount !== null && saveSuccess === null && !loading && (
            <p>
              In the last 24 hours, this rule would have triggered{' '}
              <strong>{triggerCount.toLocaleString()}</strong> time(s).
              <br />
              <br />
              Are you sure you want to create the rule {saveRuleData.id}?
            </p>
          )}
          {triggerCount !== null && saveSuccess !== null && !loading && (
            <p>
              <EuiTextColor color={saveSuccess === false ? 'danger' : 'default'}>
                {saveSuccess && 'Rule saved successfully'}
                {!saveSuccess && 'Rule save failed. Please try again.'}
              </EuiTextColor>
            </p>
          )}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <EuiLoadingSpinner size="xl" />
            </div>
          )}
        </EuiModalBody>

        {!loading && (
          <EuiModalFooter>
            {saveSuccess === null && (
              <EuiButton fill onClick={handleModalConfirm} isDisabled={!!rawValidation}>
                {triggerCount === null ? 'Save' : 'Confirm'}
              </EuiButton>
            )}
            <EuiButton onClick={cancelSaveRule}>Close</EuiButton>
          </EuiModalFooter>
        )}
      </EuiModal>
    </EuiOverlayMask>
  );

  return (
    <div>
      <EuiButton fill onClick={startSaveRule}>
        Save Rule
      </EuiButton>
      {modal}
    </div>
  );
};

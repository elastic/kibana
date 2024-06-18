/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { pick, omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiCodeBlock,
  EuiText,
  EuiTextColor,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { BASE_ALERTING_API_PATH } from '../../common/constants';
import { RuleFormData } from '../types';
import {
  CreateRuleBody,
  UPDATE_FIELDS,
  UpdateRuleBody,
  transformCreateRuleBody,
  transformUpdateRuleBody,
} from '../../common/apis';
import { useRuleFormState } from '../hooks';

const stringifyBodyRequest = ({
  formData,
  isEdit,
}: {
  formData: RuleFormData;
  isEdit: boolean;
}): string => {
  try {
    const request = isEdit
      ? transformUpdateRuleBody(pick(formData, UPDATE_FIELDS) as UpdateRuleBody)
      : transformCreateRuleBody(omit(formData, 'id') as CreateRuleBody);
    return JSON.stringify(request, null, 2);
  } catch {
    return SHOW_REQUEST_MODAL_ERROR;
  }
};

export interface RulePageShowRequestModalProps {
  onClose: () => void;
  isEdit?: boolean;
}

export const RulePageShowRequestModal = (props: RulePageShowRequestModalProps) => {
  const { onClose, isEdit = false } = props;

  const { formData, id, multiConsumerSelection } = useRuleFormState();

  const formattedRequest = useMemo(() => {
    return stringifyBodyRequest({
      formData: {
        ...formData,
        ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
      },
      isEdit,
    });
  }, [formData, isEdit, multiConsumerSelection]);

  return (
    <EuiModal
      data-test-subj="rulePageShowRequestModal"
      aria-labelledby="showRequestModal"
      onClose={onClose}
    >
      <EuiModalHeader>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id="showRequestModal" data-test-subj="modalHeaderTitle">
              {SHOW_REQUEST_MODAL_TITLE(isEdit)}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText data-test-subj="modalSubtitle">
              <p>
                <EuiTextColor color="subdued">{SHOW_REQUEST_MODAL_SUBTITLE(isEdit)}</EuiTextColor>
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCodeBlock language="json" isCopyable data-test-subj="modalRequestCodeBlock">
          {`${isEdit ? 'PUT' : 'POST'} kbn:${BASE_ALERTING_API_PATH}/rule${
            isEdit ? `/${id}` : ''
          }\n${formattedRequest}`}
        </EuiCodeBlock>
      </EuiModalBody>
    </EuiModal>
  );
};

const SHOW_REQUEST_MODAL_EDIT = i18n.translate(
  'alertsUIShared.ruleForm.showRequestModal.subheadingTitleEdit',
  {
    defaultMessage: 'edit',
  }
);

const SHOW_REQUEST_MODAL_CREATE = i18n.translate(
  'alertsUIShared.ruleForm.showRequestModal.subheadingTitleCreate',
  {
    defaultMessage: 'create',
  }
);

const SHOW_REQUEST_MODAL_SUBTITLE = (edit: boolean) =>
  i18n.translate('alertsUIShared.ruleForm.showRequestModal.subheadingTitle', {
    defaultMessage: 'This Kibana request will {requestType} this rule.',
    values: { requestType: edit ? SHOW_REQUEST_MODAL_EDIT : SHOW_REQUEST_MODAL_CREATE },
  });

const SHOW_REQUEST_MODAL_TITLE_EDIT = i18n.translate(
  'alertsUIShared.ruleForm.showRequestModal.headerTitleEdit',
  {
    defaultMessage: 'Edit',
  }
);

const SHOW_REQUEST_MODAL_TITLE_CREATE = i18n.translate(
  'alertsUIShared.ruleForm.showRequestModal.headerTitleCreate',
  {
    defaultMessage: 'Create',
  }
);

const SHOW_REQUEST_MODAL_TITLE = (edit: boolean) =>
  i18n.translate('alertsUIShared.ruleForm.showRequestModal.headerTitle', {
    defaultMessage: '{requestType} alerting rule request',
    values: {
      requestType: edit ? SHOW_REQUEST_MODAL_TITLE_EDIT : SHOW_REQUEST_MODAL_TITLE_CREATE,
    },
  });

const SHOW_REQUEST_MODAL_ERROR = i18n.translate(
  'alertsUIShared.ruleForm.showRequestModal.somethingWentWrongDescription',
  {
    defaultMessage: 'Sorry about that, something went wrong.',
  }
);

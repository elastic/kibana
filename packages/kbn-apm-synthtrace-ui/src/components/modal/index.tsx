import React from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { useScenarioContext } from '../../context/use_scenario_context';
import SpanForm, { SpanFormState } from './span-form';
import ServiceForm, { ServiceFormState } from './service-form';
import TransactionForm, { TransactionFormState } from './transaction-form';
import {
  createTransactionPayload,
  createSpanPayload,
  createDummyTransactionForService,
  createServicePayload,
} from '../../common/helpers';
import { v4 as uuidv4 } from 'uuid';

export default () => {
  const { state, dispatch } = useScenarioContext();
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });

  const closeModal = () => {
    dispatch({
      type: 'toggle_create_modal',
      payload: { isOpen: false, serviceId: '', type: 'transaction', id: '' },
    });
  };

  const saveModal = (payload: SpanFormState | TransactionFormState | ServiceFormState) => {
    let insertPayload;
    const isNewService = payload.type === 'service' && payload.id?.startsWith('new_service');
    switch (payload.type) {
      case 'span':
        insertPayload = createSpanPayload(payload, state.createModal.serviceId);
        break;
      case 'transaction':
        insertPayload = createTransactionPayload(payload, state.createModal.serviceId);
        break;
      case 'service':
        insertPayload = createDummyTransactionForService(payload.id);
        break;
    }
    if (['span', 'transaction'].includes(payload.type) || !isNewService) {
      dispatch({
        type: 'insert_node',
        payload: {
          node: insertPayload,
          id: state.createModal.id || '',
        },
      });
    } else {
      const newServiceId = uuidv4();
      insertPayload.serviceId = newServiceId;
      const serviceInsertPayload = createServicePayload(payload, newServiceId);
      dispatch({
        type: 'insert_service',
        payload: {
          id: state.createModal.id || '',
          service: serviceInsertPayload,
          node: insertPayload,
        },
      });
    }
  };

  const getForm = (
    formId: string,
    closeModal: () => void,
    saveModal: (payload: SpanFormState | TransactionFormState | ServiceFormState) => void
  ) => {
    switch (state.createModal.type) {
      case 'span':
        return <SpanForm formId={formId} onClose={closeModal} onSave={saveModal} />;
      case 'service':
        return <ServiceForm formId={formId} onClose={closeModal} onSave={saveModal} />;
      case 'transaction':
        return <TransactionForm formId={formId} onClose={closeModal} onSave={saveModal} />;
    }
  };

  return state.createModal.isOpen ? <>{getForm(modalFormId, closeModal, saveModal)}</> : <div />;
};

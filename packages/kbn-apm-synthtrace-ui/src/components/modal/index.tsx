import React from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { useScenarioContext } from '../../context/use_scenario_context';
import SpanForm, { SpanFormState } from './span-form';
import ServiceForm from './service-form';
import TransactionForm, { TransactionFormState } from './transaction-form';
import { createTransactionPayload, createSpanPayload } from '../../common/helpers';

export default () => {
  const { state, dispatch } = useScenarioContext();
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });

  const closeModal = () => {
    dispatch({
      type: 'toggle_create_modal',
      payload: { isOpen: false, serviceId: '', type: 'transaction', id: '' },
    });
  };

  const saveModal = (payload: SpanFormState | TransactionFormState) => {
    let insertPayload;
    switch (payload.type) {
      case 'span':
        insertPayload = createSpanPayload(payload, state.createModal.serviceId);
        break;
      case 'transaction':
        insertPayload = createTransactionPayload(payload, state.createModal.serviceId);
        break;
    }
    dispatch({
      type: 'insert_node',
      payload: {
        node: insertPayload,
        id: state.createModal.id || '',
      },
    });
  };

  const getForm = (
    formId: string,
    closeModal: () => void,
    saveModal: (payload: SpanFormState | TransactionFormState) => void
  ) => {
    switch (state.createModal.type) {
      case 'span':
        return <SpanForm formId={formId} onClose={closeModal} onSave={saveModal} />;
      case 'service':
        return <ServiceForm formId={formId} onClose={closeModal} onSave={closeModal} />;
      case 'transaction':
        return <TransactionForm formId={formId} onClose={closeModal} onSave={saveModal} />;
    }
  };

  return state.createModal.isOpen ? <>{getForm(modalFormId, closeModal, saveModal)}</> : <div />;
};

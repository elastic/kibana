import React from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { useScenarioContext } from '../../context/use_scenario_context';
import SpanForm, { SpanFormState } from './span-form';
import ServiceForm, { ServiceFormState } from './service-form';
import TransactionForm, { TransactionFormState } from './transaction-form';
import {
  generateTransactionPayload,
  generateSpanPayload,
  createDummyTransactionForService,
  createServicePayload,
} from '../../common/helpers';
import { v4 as uuidv4 } from 'uuid';

const ModalForm = () => {
  const { state, dispatch } = useScenarioContext();
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });

  const closeModal = () => {
    dispatch({
      type: 'toggle_modal_form',
      payload: { isOpen: false, serviceId: '', type: 'transaction', id: '', isEdit: false },
    });
  };

  const saveModal = (payload: SpanFormState | TransactionFormState | ServiceFormState) => {
    let insertPayload;
    const isNewService = payload.type === 'service' && payload.id?.startsWith('new_service');
    switch (payload.type) {
      case 'span':
        insertPayload = generateSpanPayload(payload, state.modalForm.serviceId);
        break;
      case 'transaction':
        insertPayload = generateTransactionPayload(payload, state.modalForm.serviceId);
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
          id: state.modalForm.id || '',
        },
      });
    } else {
      const newServiceId = uuidv4();
      insertPayload.serviceId = newServiceId;
      const serviceInsertPayload = createServicePayload(payload, newServiceId);
      dispatch({
        type: 'insert_service',
        payload: {
          id: state.modalForm.id || '',
          service: serviceInsertPayload,
          node: insertPayload,
        },
      });
    }
  };

  const editModal = (payload: SpanFormState | TransactionFormState, id: string) => {
    let editPayload;
    switch (payload.type) {
      case 'span':
        editPayload = generateSpanPayload(payload, state.modalForm.serviceId);
        break;
      case 'transaction':
        editPayload = generateTransactionPayload(payload, state.modalForm.serviceId);
        break;
    }
    dispatch({
      type: 'edit_node',
      payload: {
        node: editPayload,
        id,
      },
    });
  };

  const getForm = (
    formId: string,
    closeModal: () => void,
    saveModal: (payload: SpanFormState | TransactionFormState | ServiceFormState) => void
  ) => {
    switch (state.modalForm.type) {
      case 'span':
        return (
          <SpanForm formId={formId} onClose={closeModal} onSave={saveModal} onEdit={editModal} />
        );
      case 'service':
        return <ServiceForm formId={formId} onClose={closeModal} onSave={saveModal} />;
      case 'transaction':
        return (
          <TransactionForm
            formId={formId}
            onClose={closeModal}
            onSave={saveModal}
            onEdit={editModal}
          />
        );
    }
  };

  return state.modalForm.isOpen ? <>{getForm(modalFormId, closeModal, saveModal)}</> : <div />;
};

export default ModalForm;

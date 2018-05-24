import { DashboardAddPanel } from './add_panel';
import React from 'react';
import ReactDOM from 'react-dom';

let isOpen = false;

export function showAddPanel(savedObjectsClient, addNewPanel, addNewVis, listingLimit, isLabsEnabled, visTypes) {
  if (isOpen) {
    return;
  }

  isOpen = true;
  const container = document.createElement('div');
  const onClose = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
    isOpen = false;
  };
  const find = async (type, search) => {
    const resp = await savedObjectsClient.find({
      type: type,
      fields: ['title', 'visState'],
      search: search ? `${search}*` : undefined,
      page: 1,
      perPage: listingLimit,
      searchFields: ['title^3', 'description']
    });

    if (type === 'visualization' && !isLabsEnabled) {
      resp.savedObjects = resp.savedObjects.filter(savedObject => {
        const typeName = JSON.parse(savedObject.attributes.visState).type;
        const visType = visTypes.byName[typeName];
        return visType.stage !== 'lab';
      });
    }

    return resp;
  };

  const addNewVisWithCleanup = () => {
    onClose();
    addNewVis();
  };

  document.body.appendChild(container);
  const element = (
    <DashboardAddPanel
      onClose={onClose}
      find={find}
      addNewPanel={addNewPanel}
      addNewVis={addNewVisWithCleanup}
    />
  );
  ReactDOM.render(element, container);
}

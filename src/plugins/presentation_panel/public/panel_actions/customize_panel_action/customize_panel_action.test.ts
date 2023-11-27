/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export {};

// import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
// import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
// import { Container, isErrorEmbeddable } from '../../..';
// import { CustomizePanelAction } from './customize_panel_action';
// import {
//   ContactCardEmbeddable,
//   ContactCardEmbeddableInput,
//   ContactCardEmbeddableOutput,
// } from '../../../lib/test_samples/embeddables/contact_card/contact_card_embeddable';
// import {
//   CONTACT_CARD_EMBEDDABLE,
//   ContactCardEmbeddableFactory,
// } from '../../../lib/test_samples/embeddables/contact_card/contact_card_embeddable_factory';
// import { HelloWorldContainer } from '../../../lib/test_samples/embeddables/hello_world_container';
// import { embeddablePluginMock } from '../../../mocks';
// import { EditPanelAction } from '../edit_panel_action/edit_panel_action';

// let container: Container;
// let embeddable: ContactCardEmbeddable;
// const overlays = overlayServiceMock.createStartContract();
// const theme = themeServiceMock.createStartContract();
// const editPanelActionMock = { execute: jest.fn() } as unknown as EditPanelAction;

// function createHelloWorldContainer(input = { id: '123', panels: {} }) {
//   const { setup, doStart } = embeddablePluginMock.createInstance();
//   setup.registerEmbeddableFactory(
//     CONTACT_CARD_EMBEDDABLE,
//     new ContactCardEmbeddableFactory((() => {}) as any, {} as any)
//   );
//   const getEmbeddableFactory = doStart().getEmbeddableFactory;

//   return new HelloWorldContainer(input, { getEmbeddableFactory } as any);
// }

// beforeAll(async () => {
//   container = createHelloWorldContainer();
//   const contactCardEmbeddable = await container.addNewEmbeddable<
//     ContactCardEmbeddableInput,
//     ContactCardEmbeddableOutput,
//     ContactCardEmbeddable
//   >(CONTACT_CARD_EMBEDDABLE, {
//     id: 'robert',
//     firstName: 'Robert',
//     lastName: 'Baratheon',
//   });
//   if (isErrorEmbeddable(contactCardEmbeddable)) {
//     throw new Error('Error creating new hello world embeddable');
//   } else {
//     embeddable = contactCardEmbeddable;
//   }
// });

// test('execute should open flyout', async () => {
//   const customizePanelAction = new CustomizePanelAction(overlays, theme, editPanelActionMock);
//   const spy = jest.spyOn(overlays, 'openFlyout');
//   await customizePanelAction.execute({ embeddable });

//   expect(spy).toHaveBeenCalled();
// });

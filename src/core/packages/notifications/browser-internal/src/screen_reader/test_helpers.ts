/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * jsdom doesn't support the `:modal` pseudo-class, so tests decide which native `<dialog>`, if any,
 * is open as a modal. Restore with `jest.restoreAllMocks()`.
 */
export const mockOpenNativeModal = () => {
  let openModal: HTMLDialogElement | null = null;
  const querySelector = document.querySelector.bind(document);

  jest
    .spyOn(document, 'querySelector')
    .mockImplementation((selectors: string) =>
      selectors === 'dialog:modal' ? openModal : querySelector(selectors)
    );

  return {
    setOpenModal: (dialog: HTMLDialogElement | null) => {
      openModal = dialog;
    },
  };
};

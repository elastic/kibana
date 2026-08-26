/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { UploadTemplateFlyout } from './upload_template_flyout';

const VALID_TEMPLATE = `
template-metadata:
  slug: ip-reputation-check
  version: "1.1.0"
  availability: ">=9.5.0"
  name: "IP Reputation Check"
  description: "Assess the reputation of an IP address."
  categories: [enrichment]
triggers:
  - type: manual
steps:
  - name: noop
    type: console
`;

const selectFile = (content: string, name = 'template.yml') => {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([content], name, { type: 'application/x-yaml' });
  // jsdom's File does not implement `.text()`; stub it for the component read.
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(content) });
  fireEvent.change(input, { target: { files: [file] } });
};

describe('UploadTemplateFlyout', () => {
  it('validates a valid template and enables Continue, then hands back the raw YAML', async () => {
    const onUploaded = jest.fn();
    render(<UploadTemplateFlyout onClose={jest.fn()} onUploaded={onUploaded} />);

    expect(screen.getByTestId('workflowLibraryUploadContinue')).toBeDisabled();

    selectFile(VALID_TEMPLATE);

    await waitFor(() =>
      expect(screen.getByTestId('workflowLibraryUploadValid')).toBeInTheDocument()
    );
    expect(screen.getByTestId('workflowLibraryUploadContinue')).toBeEnabled();

    fireEvent.click(screen.getByTestId('workflowLibraryUploadContinue'));
    expect(onUploaded).toHaveBeenCalledWith(VALID_TEMPLATE);
  });

  it('shows a descriptive error for an invalid template and keeps Continue disabled', async () => {
    const onUploaded = jest.fn();
    render(<UploadTemplateFlyout onClose={jest.fn()} onUploaded={onUploaded} />);

    selectFile('not: a valid template\n');

    await waitFor(() =>
      expect(screen.getByText(/missing the `template-metadata` block/i)).toBeInTheDocument()
    );
    expect(screen.getByTestId('workflowLibraryUploadContinue')).toBeDisabled();
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(<UploadTemplateFlyout onClose={onClose} onUploaded={jest.fn()} />);

    fireEvent.click(screen.getByTestId('workflowLibraryUploadCancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type React from 'react';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getChromeHeaderBack, getChromeHeaderTitle } from './utils';
import { TransferAction } from '../../../../plugin_imports/embeddable_editor_service';

describe('getChromeHeaderTitle', () => {
  const discoverServiceMock = createDiscoverServicesMock();
  const { embeddableEditor } = discoverServiceMock;

  beforeEach(() => {
    vi.spyOn(embeddableEditor, 'isEmbeddedEditor').mockReturnValue(false);
    vi.spyOn(embeddableEditor, 'getEmbeddableId').mockReturnValue(undefined);
    vi.spyOn(embeddableEditor, 'getByValueTab').mockReturnValue(undefined);
  });

  it('should return the persisted session title in standalone mode', () => {
    expect(
      getChromeHeaderTitle({
        embeddableEditor,
        sessionTitle: 'My session',
      })
    ).toBe('My session');
  });

  it('should return New session when there is no persisted title', () => {
    expect(getChromeHeaderTitle({ embeddableEditor })).toBe('New session');
  });

  describe('when editing an existing dashboard panel', () => {
    beforeEach(() => {
      vi.spyOn(embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);
      vi.spyOn(embeddableEditor, 'getEmbeddableId').mockReturnValue('panel-id');
    });

    it('should return Editing {sessionTitle} for a by-reference saved session', () => {
      expect(
        getChromeHeaderTitle({
          embeddableEditor,
          sessionTitle: 'My session',
        })
      ).toBe('Editing My session');
    });

    it('should prefer the by-value tab label over the persisted session title', () => {
      vi.spyOn(embeddableEditor, 'getByValueTab').mockReturnValue({
        label: 'Panel title',
      } as DiscoverSessionTab);

      expect(
        getChromeHeaderTitle({
          embeddableEditor,
          sessionTitle: 'My session',
        })
      ).toBe('Editing Panel title');
    });

    it('should return Editing Discover session when there is no title', () => {
      expect(getChromeHeaderTitle({ embeddableEditor })).toBe('Editing Discover session');
    });
  });

  describe('when embedded from dashboard without an embeddable id (new session)', () => {
    beforeEach(() => {
      vi.spyOn(embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);
      vi.spyOn(embeddableEditor, 'getEmbeddableId').mockReturnValue(undefined);
    });

    it('should return New session', () => {
      expect(getChromeHeaderTitle({ embeddableEditor })).toBe('New session');
    });
  });
});

describe('getChromeHeaderBack', () => {
  const discoverServiceMock = createDiscoverServicesMock();
  const { embeddableEditor } = discoverServiceMock;

  beforeEach(() => {
    vi.spyOn(embeddableEditor, 'isEmbeddedEditor').mockReturnValue(false);
    vi.spyOn(embeddableEditor, 'getEmbeddableId').mockReturnValue(undefined);
    vi.spyOn(embeddableEditor, 'getOriginatingPath').mockReturnValue(undefined);
  });

  it('should return undefined if not called from an embeddable', () => {
    expect(getChromeHeaderBack(embeddableEditor)).toBeUndefined();
  });

  it('should return back navigation when editing from a dashboard', () => {
    vi.spyOn(embeddableEditor, 'isEmbeddedEditor').mockReturnValue(true);
    vi.spyOn(embeddableEditor, 'getEmbeddableId').mockReturnValue('panel-id');
    vi.spyOn(embeddableEditor, 'getOriginatingPath').mockReturnValue('/app/dashboards#/view/abc');

    const back = getChromeHeaderBack(embeddableEditor);

    expect(back).toEqual({
      href: '/app/dashboards#/view/abc',
      onClick: expect.any(Function),
      label: 'Dashboard',
    });

    const preventDefault = vi.fn();
    if (back && typeof back !== 'string' && back.onClick) {
      back.onClick({ preventDefault } as unknown as React.MouseEvent);
    }

    // The default href navigation must be prevented so only the programmatic transfer runs.
    expect(preventDefault).toHaveBeenCalled();
    expect(embeddableEditor.transferBackToEditor).toHaveBeenCalledWith(TransferAction.Cancel);
  });
});

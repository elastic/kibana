/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLinkActionProps } from '.';

describe('link_action_utils', () => {
  describe('getLinkActionProps', () => {
    it('returns empty props when neither href nor onClick are provided', () => {
      expect(getLinkActionProps({})).toEqual({});
    });

    it('returns only href when href is provided without onClick', () => {
      expect(getLinkActionProps({ href: '/app/discover' })).toEqual({ href: '/app/discover' });
    });

    it('returns only onClick when onClick is provided without href', () => {
      const onClick = jest.fn();
      const props = getLinkActionProps({ onClick });
      expect(props.href).toBeUndefined();
      expect(typeof props.onClick).toBe('function');

      props.onClick?.({} as any);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('prefers onClick over href on plain left click', () => {
      const onClick = jest.fn();
      const props = getLinkActionProps({ href: '/app/discover', onClick });

      const preventDefault = jest.fn();
      props.onClick?.({
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault,
      } as any);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it('does not intercept modifier click when href is present', () => {
      const onClick = jest.fn();
      const props = getLinkActionProps({ href: '/app/discover', onClick });

      const preventDefault = jest.fn();
      props.onClick?.({
        button: 0,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault,
      } as any);

      expect(onClick).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('does not intercept middle click when href is present', () => {
      const onClick = jest.fn();
      const props = getLinkActionProps({ href: '/app/discover', onClick });

      const preventDefault = jest.fn();
      props.onClick?.({
        button: 1,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault,
      } as any);

      expect(onClick).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });
});

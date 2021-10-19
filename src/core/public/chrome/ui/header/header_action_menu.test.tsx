/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import { HeaderActionMenu } from './header_action_menu';
import { MountPoint, UnmountCallback } from '../../../types';

type MockedUnmount = jest.MockedFunction<UnmountCallback>;

describe('HeaderActionMenu', () => {
  let component: ReactWrapper;
  let menuMount$: BehaviorSubject<MountPoint | undefined>;
  let unmounts: Record<string, MockedUnmount>;

  beforeEach(() => {
    menuMount$ = new BehaviorSubject<MountPoint | undefined>(undefined);
    unmounts = {};
  });

  const refresh = () => {
    new Promise(async (resolve, reject) => {
      try {
        if (component) {
          act(() => {
            component.update();
          });
        }

        setImmediate(() => resolve(component)); // flushes any pending promises
      } catch (error) {
        reject(error);
      }
    });
  };

  const createMountPoint =
    (id: string, content: string = id): MountPoint =>
    (root): MockedUnmount => {
      const container = document.createElement('DIV');
      // eslint-disable-next-line no-unsanitized/property
      container.innerHTML = content;
      root.appendChild(container);
      const unmount = jest.fn(() => container.remove());
      unmounts[id] = unmount;
      return unmount;
    };

  it('mounts the current value of the provided observable', async () => {
    component = mount(<HeaderActionMenu actionMenu$={menuMount$} />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    await refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>FOO</div></div>"`
    );
  });

  it('clears the content of the component when emitting undefined', async () => {
    component = mount(<HeaderActionMenu actionMenu$={menuMount$} />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    await refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>FOO</div></div>"`
    );

    act(() => {
      menuMount$.next(undefined);
    });
    await refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"></div>"`
    );
  });

  it('updates the dom when a new mount point is emitted', async () => {
    component = mount(<HeaderActionMenu actionMenu$={menuMount$} />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    await refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>FOO</div></div>"`
    );

    act(() => {
      menuMount$.next(createMountPoint('BAR'));
    });
    await refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>BAR</div></div>"`
    );
  });

  it('calls the previous mount point `unmount` when mounting a new mount point', async () => {
    component = mount(<HeaderActionMenu actionMenu$={menuMount$} />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    await refresh();

    expect(Object.keys(unmounts)).toEqual(['FOO']);
    expect(unmounts.FOO).not.toHaveBeenCalled();

    act(() => {
      menuMount$.next(createMountPoint('BAR'));
    });
    await refresh();

    expect(Object.keys(unmounts)).toEqual(['FOO', 'BAR']);
    expect(unmounts.FOO).toHaveBeenCalledTimes(1);
    expect(unmounts.BAR).not.toHaveBeenCalled();
  });
});

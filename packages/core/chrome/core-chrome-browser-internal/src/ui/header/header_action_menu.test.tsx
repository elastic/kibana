/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import type { MountPoint, UnmountCallback } from '@kbn/core-mount-utils-browser';
import { HeaderActionMenu, useHeaderActionMenuMounter } from './header_action_menu';

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
    new Promise((resolve, reject) => {
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

  it('mounts the current value of the provided observable', () => {
    const TestComponent = () => {
      const mounter = useHeaderActionMenuMounter(menuMount$);
      return <HeaderActionMenu mounter={mounter} />;
    };
    component = mount(<TestComponent />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>FOO</div></div>"`
    );
  });

  it('clears the content of the component when emitting undefined', () => {
    const TestComponent = () => {
      const mounter = useHeaderActionMenuMounter(menuMount$);
      return <HeaderActionMenu mounter={mounter} />;
    };

    component = mount(<TestComponent />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>FOO</div></div>"`
    );

    act(() => {
      menuMount$.next(undefined);
    });
    refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"></div>"`
    );
  });

  it('updates the dom when a new mount point is emitted', () => {
    const TestComponent = () => {
      const mounter = useHeaderActionMenuMounter(menuMount$);
      return <HeaderActionMenu mounter={mounter} />;
    };
    component = mount(<TestComponent />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>FOO</div></div>"`
    );

    act(() => {
      menuMount$.next(createMountPoint('BAR'));
    });
    refresh();

    expect(component.html()).toMatchInlineSnapshot(
      `"<div data-test-subj=\\"headerAppActionMenu\\"><div>BAR</div></div>"`
    );
  });

  it('calls the previous mount point `unmount` when mounting a new mount point', () => {
    const TestComponent = () => {
      const mounter = useHeaderActionMenuMounter(menuMount$);
      return <HeaderActionMenu mounter={mounter} />;
    };
    component = mount(<TestComponent />);

    act(() => {
      menuMount$.next(createMountPoint('FOO'));
    });
    refresh();

    expect(Object.keys(unmounts)).toEqual(['FOO']);
    expect(unmounts.FOO).not.toHaveBeenCalled();

    act(() => {
      menuMount$.next(createMountPoint('BAR'));
    });
    refresh();

    expect(Object.keys(unmounts)).toEqual(['FOO', 'BAR']);
    expect(unmounts.FOO).toHaveBeenCalledTimes(1);
    expect(unmounts.BAR).not.toHaveBeenCalled();
  });
});

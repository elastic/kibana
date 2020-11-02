/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    new Promise(async (resolve) => {
      if (component) {
        act(() => {
          component.update();
        });
      }
      setImmediate(() => resolve(component)); // flushes any pending promises
    });
  };

  const createMountPoint = (id: string, content: string = id): MountPoint => (
    root
  ): MockedUnmount => {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { MountPoint, UnmountCallback } from '@kbn/core/public';
import { MountPointPortal } from './mount_point_portal';
import { act } from 'react-dom/test-utils';

describe('MountPointPortal', () => {
  let portalTarget: HTMLElement;
  let mountPoint: MountPoint;
  let setMountPoint: jest.Mock<(mountPoint: MountPoint<HTMLElement>) => void>;
  let dom: ReactWrapper;

  const refresh = () => {
    new Promise(async (resolve, reject) => {
      try {
        if (dom) {
          act(() => {
            dom.update();
          });
        }

        setImmediate(() => resolve(dom)); // flushes any pending promises
      } catch (error) {
        reject(error);
      }
    });
  };

  beforeEach(() => {
    portalTarget = document.createElement('div');
    document.body.append(portalTarget);
    setMountPoint = jest.fn().mockImplementation((mp) => (mountPoint = mp));
  });

  afterEach(() => {
    if (portalTarget) {
      portalTarget.remove();
    }
  });

  it('calls the provided `setMountPoint` during render', async () => {
    dom = mount(
      <MountPointPortal setMountPoint={setMountPoint}>
        <span>portal content</span>
      </MountPointPortal>
    );

    await refresh();

    expect(setMountPoint).toHaveBeenCalledTimes(1);
  });

  it('renders the portal content when calling the mountPoint ', async () => {
    dom = mount(
      <MountPointPortal setMountPoint={setMountPoint}>
        <span>portal content</span>
      </MountPointPortal>
    );

    await refresh();

    expect(mountPoint).toBeDefined();

    act(() => {
      mountPoint(portalTarget);
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<span>portal content</span>');
  });

  it('cleanup the portal content when the component is unmounted', async () => {
    dom = mount(
      <MountPointPortal setMountPoint={setMountPoint}>
        <span>portal content</span>
      </MountPointPortal>
    );

    act(() => {
      mountPoint(portalTarget);
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<span>portal content</span>');

    dom.unmount();

    await refresh();

    expect(portalTarget.innerHTML).toBe('');
  });

  it('cleanup the portal content when unmounting the MountPoint from outside', async () => {
    dom = mount(
      <MountPointPortal setMountPoint={setMountPoint}>
        <span>portal content</span>
      </MountPointPortal>
    );

    let unmount: UnmountCallback;
    act(() => {
      unmount = mountPoint(portalTarget);
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<span>portal content</span>');

    act(() => {
      unmount();
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('');
  });

  it('updates the content of the portal element when the content of MountPointPortal changes', async () => {
    const Wrapper: FC<{
      setMount: (mountPoint: MountPoint<HTMLElement>) => void;
      portalContent: string;
    }> = ({ setMount, portalContent }) => {
      return (
        <MountPointPortal setMountPoint={setMount}>
          <div>{portalContent}</div>
        </MountPointPortal>
      );
    };

    dom = mount(<Wrapper setMount={setMountPoint} portalContent={'before'} />);

    act(() => {
      mountPoint(portalTarget);
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<div>before</div>');

    dom.setProps({
      portalContent: 'after',
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<div>after</div>');
  });

  it('cleanup the previous portal content when setMountPoint changes', async () => {
    dom = mount(
      <MountPointPortal setMountPoint={setMountPoint}>
        <span>portal content</span>
      </MountPointPortal>
    );

    act(() => {
      mountPoint(portalTarget);
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<span>portal content</span>');

    const newSetMountPoint = jest.fn();

    dom.setProps({
      setMountPoint: newSetMountPoint,
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('');
  });

  it('intercepts errors and display an error message', async () => {
    const CrashTest = () => {
      throw new Error('crash');
    };

    dom = mount(
      <MountPointPortal setMountPoint={setMountPoint}>
        <CrashTest />
      </MountPointPortal>
    );

    act(() => {
      mountPoint(portalTarget);
    });

    await refresh();

    expect(portalTarget.innerHTML).toBe('<p>Error rendering portal content</p>');
  });
});

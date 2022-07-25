/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useRef, useEffect, useState, Component } from 'react';
import ReactDOM from 'react-dom';
import { MountPoint } from '@kbn/core/public';
import { useIfMounted } from './utils';

interface MountPointPortalProps {
  setMountPoint: (mountPoint: MountPoint<HTMLElement>) => void;
}

/**
 * Utility component to portal a part of a react application into the provided `MountPoint`.
 */
export const MountPointPortal: React.FC<MountPointPortalProps> = ({ children, setMountPoint }) => {
  // state used to force re-renders when the element changes
  const [shouldRender, setShouldRender] = useState(false);
  const el = useRef<HTMLElement>();
  const ifMounted = useIfMounted();

  useEffect(() => {
    setMountPoint((element) => {
      ifMounted(() => {
        el.current = element;
        setShouldRender(true);
      });
      return () => {
        // the component can be unmounted from the dom before the portal target actually
        // calls the `unmount` function. This is a no-op but show a scary warning in the console
        // so we use a ifMounted effect to avoid it.
        ifMounted(() => {
          setShouldRender(false);
          el.current = undefined;
        });
      };
    });

    return () => {
      ifMounted(() => {
        setShouldRender(false);
        el.current = undefined;
      });
    };
  }, [setMountPoint]);

  if (shouldRender && el.current) {
    return ReactDOM.createPortal(
      <MountPointPortalErrorBoundary>{children}</MountPointPortalErrorBoundary>,
      el.current
    );
  } else {
    return null;
  }
};

class MountPointPortalErrorBoundary extends Component<{}, { error?: unknown }> {
  state = {
    error: undefined,
  };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch() {
    // nothing, will just rerender to display the error message
  }

  render() {
    if (this.state.error) {
      return (
        <p>
          {i18n.translate('kibana-react.mountPointPortal.errorMessage', {
            defaultMessage: 'Error rendering portal content',
          })}
        </p>
      );
    }
    return this.props.children;
  }
}

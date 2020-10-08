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

import { i18n } from '@kbn/i18n';
import React, { useRef, useEffect, useState, Component } from 'react';
import ReactDOM from 'react-dom';
import { MountPoint } from 'kibana/public';
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

class MountPointPortalErrorBoundary extends Component<{}, { error?: any }> {
  state = {
    error: undefined,
  };

  static getDerivedStateFromError(error: any) {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { Global } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useIllustration } from './use_illustration';
import { IllustrationName } from './assets';

interface HackProps {
  value: string;
  className?: string;
}

// This is a hack component to demo inlined SVGs, which are not
// supported by @kbn/storybook.
const Hack = React.memo(
  ({ value, className }: HackProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSVG] = useState<SVGSVGElement | null>(null);

    React.useEffect(() => {
      if (ref.current) {
        // ref.current.outerHTML = value;
        ref.current.insertAdjacentHTML('afterend', value);
        setSVG(ref.current.nextSibling as SVGSVGElement);
        ref.current.remove();
      }
    }, [value]);

    useEffect(() => {
      if (svg && className) {
        svg.classList.add(className);
      }
    }, [svg, className]);

    // placeholder component which will be entirely replaced
    return <div ref={ref} />;
  },
  () => true
);

export interface IllustrationProps {
  name: IllustrationName;
  mode?: 'light' | 'dark';
  theme: 'amsterdam' | 'borealis';
  className?: string;
  /** Display the image irrespective of global colors, e.g. display in Borealis even if the page is Amsterdam. */
  isLocal?: boolean;
}

export const Illustration = ({
  name,
  theme,
  mode,
  className,
  isLocal = false,
}: IllustrationProps) => {
  const { colorMode } = useEuiTheme();
  const illustration = useIllustration(name, isLocal);

  if (!illustration) {
    return null;
  }

  if (mode === undefined) {
    mode = colorMode === 'LIGHT' ? 'light' : 'dark';
  }

  const { svg: value, styles } = illustration;

  if (isLocal) {
    return <Hack value={value} className={styles ? (styles[theme][mode] as string) : ''} />;
  } else {
    return (
      <>
        <Global styles={styles ? styles[theme][mode] : []} />
        <Hack {...{ value, className }} />
      </>
    );
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiLink, EuiScreenReaderOnly, EuiToolTip } from '@elastic/eui';
import classNames from 'classnames';
import { once } from 'lodash';
import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  type Observable,
  fromEvent,
  map,
  race,
  mergeMap,
  takeUntil,
  takeLast,
  takeWhile,
  defaultIfEmpty,
  repeatWhen,
} from 'rxjs';

import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/presentation-publishing';
import {
  CustomizePanelActionApi,
  isApiCompatibleWithCustomizePanelAction,
} from '../../panel_actions/customize_panel_action';
import { openCustomizePanelFlyout } from '../../panel_actions/customize_panel_action/open_customize_panel';

export const placeholderTitle = i18n.translate('presentationPanel.placeholderTitle', {
  defaultMessage: '[No Title]',
});

const getAriaLabelForTitle = (title?: string) => {
  return title
    ? i18n.translate('presentationPanel.enhancedAriaLabel', {
        defaultMessage: 'Panel: {title}',
        values: { title: title || placeholderTitle },
      })
    : i18n.translate('presentationPanel.ariaLabel', {
        defaultMessage: 'Panel',
      });
};

const createDocumentMouseMoveListener = once(() => fromEvent<MouseEvent>(document, 'mousemove'));
const createDocumentMouseUpListener = once(() => fromEvent<MouseEvent>(document, 'mouseup'));

export const usePresentationPanelTitleClickHandler = (titleElmRef: HTMLElement | null) => {
  const onClick = useRef<Observable<{ dragged: boolean }> | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (titleElmRef) {
      const mouseup = createDocumentMouseUpListener();
      const mousemove = createDocumentMouseMoveListener();
      const mousedown = fromEvent<MouseEvent>(titleElmRef, 'mousedown');
      const keydown = fromEvent<KeyboardEvent>(titleElmRef, 'keydown');

      const mousedragExclusiveClick$ = mousedown
        .pipe(
          mergeMap(function (md) {
            // create reference for when mouse is down
            const startX = md.offsetX;
            const startY = md.offsetY;

            return mousemove
              .pipe(
                map(function (mm) {
                  return { dragged: startX !== mm.clientX && startY !== mm.clientY };
                })
              )
              .pipe(takeUntil(mouseup), takeLast(1))
              .pipe(defaultIfEmpty({ dragged: false }));
          })
        )
        .pipe(repeatWhen(() => mousedown));

      onClick.current = race(
        keydown.pipe(takeWhile((kd) => kd.key === 'Enter')).pipe(map(() => ({ dragged: false }))),
        mousedragExclusiveClick$
      );

      setInitialized(true);
    }
  }, [titleElmRef]);

  return initialized ? onClick.current : null;
};

export const PresentationPanelTitle = ({
  api,
  headerId,
  viewMode,
  hideTitle,
  panelTitle,
  panelDescription,
}: {
  api: unknown;
  headerId: string;
  hideTitle?: boolean;
  panelTitle?: string;
  panelDescription?: string;
  viewMode?: ViewMode;
}) => {
  const [panelTitleElmRef, setPanelTitleElmRef] = useState<HTMLElement | null>(null);

  const panelTitleElement = useMemo(() => {
    if (hideTitle) return null;
    const titleClassNames = classNames('embPanel__titleText', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      embPanel__placeholderTitleText: !panelTitle,
    });

    if (viewMode !== 'edit' || !isApiCompatibleWithCustomizePanelAction(api)) {
      return <span className={titleClassNames}>{panelTitle}</span>;
    }

    return (
      <EuiLink
        color="text"
        ref={setPanelTitleElmRef}
        className={titleClassNames}
        aria-label={i18n.translate('presentationPanel.header.titleAriaLabel', {
          defaultMessage: 'Click to edit title: {title}',
          values: { title: panelTitle ?? placeholderTitle },
        })}
        data-test-subj={'embeddablePanelTitleLink'}
      >
        {panelTitle || placeholderTitle}
      </EuiLink>
    );
  }, [setPanelTitleElmRef, hideTitle, panelTitle, viewMode, api]);

  const onClick = usePresentationPanelTitleClickHandler(panelTitleElmRef);

  useEffect(() => {
    const panelTitleClickSubscription = onClick?.subscribe(function onClickHandler({ dragged }) {
      if (!dragged) {
        openCustomizePanelFlyout({
          api: api as CustomizePanelActionApi,
          focusOnTitle: true,
        });
      }
    });

    return () => panelTitleClickSubscription?.unsubscribe();
  }, [api, onClick]);

  const describedPanelTitleElement = useMemo(() => {
    if (hideTitle) return null;
    if (!panelDescription) {
      return (
        <span data-test-subj="embeddablePanelTitleInner" className="embPanel__titleInner">
          {panelTitleElement}
        </span>
      );
    }

    const ariaLabel = getAriaLabelForTitle(panelTitle);
    const ariaLabelElement = (
      <EuiScreenReaderOnly>
        <span id={headerId}>{ariaLabel}</span>
      </EuiScreenReaderOnly>
    );

    return (
      <EuiToolTip
        title={!hideTitle ? panelTitle || undefined : undefined}
        content={panelDescription}
        delay="regular"
        position="top"
        anchorClassName="embPanel__titleTooltipAnchor"
        anchorProps={{ 'data-test-subj': 'embeddablePanelTooltipAnchor' }}
      >
        <div data-test-subj="embeddablePanelTitleInner" className="embPanel__titleInner">
          {!hideTitle ? (
            <h2>
              {ariaLabelElement}
              {panelTitleElement}&nbsp;
            </h2>
          ) : null}
          <EuiIcon
            type="iInCircle"
            color="subdued"
            data-test-subj="embeddablePanelTitleDescriptionIcon"
            tabIndex={0}
          />
        </div>
      </EuiToolTip>
    );
  }, [hideTitle, panelDescription, panelTitle, panelTitleElement, headerId]);

  return describedPanelTitleElement;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Observable } from 'rxjs';
import type { OverlayBanner } from './banners_service';

import './banners_list.scss';

interface Props {
  banners$: Observable<OverlayBanner[]>;
}

/**
 * BannersList is a list of "banners". A banner something that is displayed at the top of Kibana that may or may not
 * disappear.
 *
 * Whether or not a banner can be closed is completely up to the author of the banner. Some banners make sense to be
 * static, such as banners meant to indicate the sensitivity (e.g., classification) of the information being
 * represented.
 */
export const BannersList: React.FunctionComponent<Props> = ({ banners$ }) => {
  const [banners, setBanners] = useState<OverlayBanner[]>([]);
  useEffect(() => {
    const subscription = banners$.subscribe(setBanners);
    return () => subscription.unsubscribe();
  }, [banners$]); // Only un/re-subscribe if the Observable changes

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="kbnGlobalBannerList">
      {banners.map((banner) => (
        <BannerItem key={banner.id} banner={banner} />
      ))}
    </div>
  );
};

const BannerItem: React.FunctionComponent<{ banner: OverlayBanner }> = ({ banner }) => {
  const element = useRef(null);
  useEffect(() => banner.mount(element.current!), [banner]); // Only unmount / remount if banner object changed.

  return (
    <div
      data-test-priority={banner.priority}
      className="kbnGlobalBannerList__item"
      ref={element}
      data-test-subj="global-banner-item"
    />
  );
};

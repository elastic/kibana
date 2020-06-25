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

import React, { useEffect, useRef, useState } from 'react';
import { Observable } from 'rxjs';

import { OverlayBanner } from './banners_service';

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
    <div data-test-priority={banner.priority} className="kbnGlobalBannerList__item" ref={element} />
  );
};

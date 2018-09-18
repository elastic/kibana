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
import { Banner } from '../banners_service';
import './global_banner_item.css';

interface Props {
  banner: Banner;
}

export class GlobalBannerItem extends React.Component<Props> {
  private readonly ref = React.createRef<HTMLDivElement>();
  private unrenderBanner?: () => void;

  public componentDidMount() {
    if (!this.ref.current) {
      throw new Error('<GlobalBanner /> mounted without ref');
    }

    this.unrenderBanner = this.props.banner.render(this.ref.current) || undefined;
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.banner.render === prevProps.banner.render) {
      return;
    }

    if (!this.ref.current) {
      throw new Error('<GlobalBanner /> updated without ref');
    }

    if (this.unrenderBanner) {
      this.unrenderBanner();
    }

    this.unrenderBanner = this.props.banner.render(this.ref.current) || undefined;
  }

  public componentWillUnmount() {
    if (this.unrenderBanner) {
      this.unrenderBanner();
    }
  }

  public render() {
    return <div className="globalBanner__item" ref={this.ref} />;
  }
}

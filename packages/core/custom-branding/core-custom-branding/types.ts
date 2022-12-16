/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject, Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

/**
 * Combined parts of custom branding
 * Properties are each optional to provide flexibility for the Kibana
 * operator
 * @public
 */
export interface CustomBranding {
  /** Similar to iconType
   * @example 'logoGithub'
   * This is refering to the elastic logo in the top left
   * */
  logo?: string;
  /** Set as string
   * link to a file service
   * */
  favicon?: string;
  /** Instead of elastic, Kibana operators can customize the title */
  pageTitle?: string;
  /**
   * equivalent to Elastic Mark
   * @link packages/core/chrome/core-chrome-browser-internal/src/ui/header/elastic_mark.tsx
   */
  customizedLogo?: string;
}

/**
 * @TODO
 * The service would need to take in the observable equivalents for the props
 * but not sure if these should be public since shouldn't this be hidden for the kibana operators?
 */
interface Props extends CustomBranding {
  logo$?: Observable<string>;
  favicon$?: Observable<string>;
  pageTitle$?: Observable<string>;
  customizedLogo$?: Observable<string>;
}

/** @public */
export interface CustomBrandingServiceSetup {}

/** @public */
export interface CustomBrandingStart {
  get?: Partial<Props>;
  set?: (customBranding: Partial<Props>) => void;
  get$?: Observable<CustomBranding>;
}

export class CustomBrandingService {
  private customBrandingPluginRegistered: string | undefined = undefined;
  // @TODO I'm think Partial<Props> makes sense since I want customBranding to be at least one of the optional Props. I wouldn't be surprised if there's a more graceful way to convey this in typescript
  private customBranding: Partial<Props> | undefined;
  // @TODO but what if the kibana operator isn't using each customizable part of custom branding? would this be one observable or like a Map of observables?
  private customBranding$: Observable<CustomBranding>;

  // @TODO would this be part of CustomBrandingServiceSetup?
  private registerCustomBrandingPlugin(pluginName: string) {
    if (this.customBrandingPluginRegistered) {
      throw new Error('Another plugin is already registered');
    }
    this.customBrandingPluginRegistered = pluginName;
  }

  // Would there need to be separate setters for each prop in CustomBranding?
  private set(customBranding: Partial<Props>) {
    this.customBranding = customBranding;
  }

  private get() {
    return this.customBranding;
  }

  private get$() {
    return this.customBranding$;
  }

  /** @public */
  public setup(): CustomBrandingServiceSetup {
    return this.registerCustomBrandingPlugin;
  }

  /**
   * @TODO I missed this with the CustomBrandingServiceSetup, but this makes sense to use this type here right?
   * In the gist you kindly wrote it's not typed and I'm just wondering - I dont have an opinion on it but trying to understand it better thank you
   *  @public */
  public start(): CustomBrandingStart {
    return {
      get: this.get(),
      get$: this.get$(),
      set: this.set,
    };
  }
}

// Helper function
export const getObservable$ = (logo: string | Observable<string> | undefined) =>
  useObservable(
    logo
      ? (logo as unknown as Observable<string>)
      : new BehaviorSubject<string | undefined>(undefined)
  );

- [Core Conventions](#core-conventions)
  - [1. Exposing API Types](#1-exposing-api-types)
  - [2. API Structure and nesting](#2-api-structure-and-nesting)
  - [3. Tests and mocks](#3-tests-and-mocks)

# Core Conventions

This document contains conventions for development inside `src/core`. Although
many of these might be more widely applicable, adoption within the rest of
Kibana is not the primary objectiv.

## 1. Exposing API Types
The following section applies to the types that describe the entire surface
area of Core API's and does not apply to internal types.

 - 1.1 All API types must be exported from the top-level `server` or `public`
   directories.

   ```ts
   // -- good --
   import { IRouter } from 'src/core/server';

   // -- bad --
   import { IRouter } from 'src/core/server/http/router.ts';
   ```

   > Why? This is required for generating documentation from our inline
   > typescript doc comments, makes it easier for API consumers to find the
   > relevant types and creates a clear distinction between external and
   > internal types.

 - 1.2 Classes must not be exposed directly. Instead, use a separate type,
   prefixed with an 'I', to describe the public contract of the class.

   ```ts
   // -- good (alternative 1) --
   /**
    * @public
    * {@link UiSettingsClient}
    */
   export type IUiSettingsClient = PublicContractOf<UiSettingsClient>;

   /** internal only */
   export class UiSettingsClient {
     constructor(private setting: string) {}
     /** Retrieve all settings */
     public getSettings(): { return this.settings; }
   };

   // -- good (alternative 2) --
      export interface IUiSettingsClient {
     /** Retrieve all settings */
     public getSettings(): string;
   }

   export class UiSettingsClient implements IUiSettingsClient {
     public getSettings(): string;
   }

   // -- bad --
   /** external */
   export class UiSettingsClient {
     constructor(private setting: string) {}
     public getSettings(): { return this.settings; }
   }
   ```

   > Why? Classes' private members form part of their type signature making it
   > impossible to mock a dependency typed as a `class`.
   >
   > Until we can use ES private field support in Typescript 3.8
   > https://github.com/elastic/kibana/issues/54906 we have two alternatives
   > each with their own pro's and cons:
   >
   > #### Using a derived class (alternative 1)
   >
   > Pro's:
   > - TSDoc comments are located with the source code
   > - The class acts as a single source of type information
   >
   > Con's:
   > - "Go to definition" first takes you to where the type gets derived
   >   requiring a second "Go to definition" to navigate to the type source.
   >
   > #### Using a separate interface (alternative 2)
   > Pro's:
   > - Creates an explicit external API contract
   > - "Go to definition" will take you directly to the type definition.
   >
   > Con's:
   > - TSDoc comments are located with the interface not next to the
   >   implementation source code.
   > - Creates duplicate type information between the interface and
   >   implementation class.

## 2. API Structure and nesting
 - 2.1 Nest API methods into their own namespace only if we expect we will be
   adding additional methods to that namespace.

   ```ts
   // good
   core.overlays.openFlyout(...);
   core.overlays.openModal(...);
   core.overlays.banners.add(...);
   core.overlays.banners.remove(...);
   core.overlays.banners.replace(...);

   // bad
   core.overlays.flyouts.open(...);
   core.overlays.modals.open(...);
   ```

   > Why? Nested namespaces should facilitate discovery and navigation for
   > consumers of the API. Having namespaces with a single method, effectively
   > hides the method under an additional layer without improving the
   > organization. However, introducing namespaces early on can avoid API
   > churn when we know related API methods will be introduced.

## 3. Tests and mocks
 - 3.1 Declare Jest mocks with a temporary variable to ensure types are
   correctly inferred.

   ```ts
   // -- good --
   const createMock => {
     const mocked: jest.Mocked<IContextService> = {
       start: jest.fn(),
     };
     mocked.start.mockReturnValue(createStartContractMock());
     return mocked;
   };
   // -- bad --
   const createMock = (): jest.Mocked<ContextServiceContract> => ({
     start: jest.fn().mockReturnValue(createSetupContractMock()),
   });
   ```

   > Why? Without the temporary variable, Jest types the `start` function as
   > `jest<any, any>` and, as a result, doesn't typecheck the mock return
   > value.

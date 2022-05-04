# Discover

Contains the Discover application and the saved search embeddable.

## Project tree

### [src/plugins/discover/public](./public)

Contains all the client-only code. When you initially load Discover, [public/application/main](./public/application/main) is executed and displayed. 

* **[/application](./public/application)** \
One folder for every "route", each folder contains files and folders related only to this route
  * **[/context](./public/application/context)** (Also known of "Surrounding documents")
  * **[/doc](./public/application/doc)** (Also known as "Single document")
  * **[/main](./public/application/main)** (Main part of Discover containing the document table)
  * **[/not_found](./public/application/not_found)** (Rendering the fallback route)
  * **[/view_alert](./public/application/view_alert)** (Forwarding links in alert notifications)
* **[/components](./public/components)** (All React components used in more than just one app)
* **[/embeddable](./public/embeddable)** (Contains the code related to the saved search embeddable)
* **[/services](./public/services)** (Everything we consider services either for external or internal use)
* **[/utils](./public/utils)** (All utility functions used across more than one application

### [src/plugins/discover/server](./server)

Contains all the server-only code.

### [src/plugins/discover/common](./common))
Contains all code shared by client and server




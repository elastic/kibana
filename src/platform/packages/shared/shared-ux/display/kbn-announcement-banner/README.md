# @kbn/announcement-banner

An announcement banner component with optional media, actions and dismiss button.

## Usage

```jsx
// Minimal usage
<AnnouncementBanner title="This is a title" media={<img src="" alt="">} />

// With body text
<AnnouncementBanner
  title="This is a title"
  text="Announcement body text"
  media={<img src="" alt="">}
/>

// With actions
<AnnouncementBanner
  title="This is a title"
  text="Announcement body text"
  media={<img src="" alt="">}
  actionProps={{
    primary: { children: 'Primary action' onClick: () => {} },
    secondary: { children: 'Secondary action' onClick: () => {} }
  }}
/>

// With dismiss button
<AnnouncementBanner
  title="This is a title"
  text="Announcement body text"
  media={<img src="" alt="">}
  onDismiss={() => {}}
/>
```

## Development

1. Install dependencies:

```bash
yarn kbn bootstrap
```

2. Start Storybook:

```bash
yarn storybook shared_ux
```

Open [http://localhost:9001](http://localhost:9001) to view the application.

## Testing

The project includes comprehensive test coverage using Jest and RTL.

Run tests with:

```bash
yarn test:jest src/platform/packages/shared/shared-ux/display/kbn-announcement-banner              # Run all tests
yarn test:jest src/platform/packages/shared/shared-ux/display/kbn-announcement-banner --watch      # Run in watch mode
```

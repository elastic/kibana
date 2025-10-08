# Video Recording for Functional Tests

The Functional Test Runner (FTR) supports high-performance video recording with intelligent platform detection to provide optimal recording quality and performance across different operating systems.

## Overview

The video recording feature uses a **hybrid approach** that automatically selects the best recording method for your platform:

- **macOS**: High-performance X11 recording via XQuartz (30+ FPS)
- **Linux**: High-performance X11 recording via Xvfb (30+ FPS)
- **Windows**: Screenshot-based fallback recording (5 FPS)

This approach provides excellent video quality and performance on Unix-like systems while maintaining compatibility across all platforms.

## Usage

To enable video recording, use the `--record-video` flag when running functional tests:

```bash
# Using FTR directly
node scripts/functional_test_runner --config test/functional/config.ts --record-video

# Using the functional_tests script
node scripts/functional_tests --config test/functional/config.ts --record-video

# Combine with headless mode for CI/CD
node scripts/functional_tests --config test/functional/config.ts --record-video --headless
```

## Platform Requirements

### macOS
For high-performance recording (30+ FPS):
```bash
# Install XQuartz (X11 for macOS)
brew install --cask xquartz

# Install ffmpeg
brew install ffmpeg

# Restart your terminal after XQuartz installation
```

### Linux
For high-performance recording (30+ FPS):
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install xvfb ffmpeg

# CentOS/RHEL/Fedora
sudo yum install xorg-x11-server-Xvfb ffmpeg
# or
sudo dnf install xorg-x11-server-Xvfb ffmpeg
```

### Windows
For fallback recording (5 FPS):
```bash
# Install ffmpeg (choose one method)

# Option 1: Using Chocolatey
choco install ffmpeg

# Option 2: Using Scoop
scoop install ffmpeg

# Option 3: Download from https://ffmpeg.org/download.html
# and add to PATH
```

## Performance Comparison

| Platform | Method | Frame Rate | CPU Usage | Video Quality | Setup Complexity |
|----------|--------|------------|-----------|---------------|------------------|
| **macOS** | **XQuartz + ffmpeg** | **30+ FPS** | **Low** | **Excellent** | Medium |
| **Linux** | **Xvfb + ffmpeg** | **30+ FPS** | **Low** | **Excellent** | Easy |
| **Windows** | Screenshot fallback | 5 FPS | Medium | Good | Easy |

## Features

- **Intelligent Platform Detection**: Automatically selects the best recording method
- **High Performance**: 30+ FPS recording on macOS and Linux
- **Real-time Recording**: Direct screen capture with no post-processing delays
- **Automatic Fallback**: Gracefully falls back to screenshot method when X11 unavailable
- **Smart File Naming**: Videos named with test configuration and timestamp
- **Robust Error Handling**: Tests continue even if recording fails
- **Cross-platform Compatibility**: Works on all major operating systems

## Video Storage

Videos are saved to: `target/functional-tests/videos/`

File naming format: `{test-name}_{timestamp}.mp4`

Example: `dashboard_tests_2024-07-21T09-26-15-000Z.mp4`

## Recording Methods

### High-Performance X11 Recording (macOS/Linux)
- **Technology**: Direct X11 screen capture via ffmpeg
- **Frame Rate**: 30+ FPS
- **Resolution**: 1300x760 (optimized for test viewing)
- **Codec**: H.264 with fast preset
- **Benefits**: Smooth video, low CPU usage, real-time recording

### Screenshot Fallback (Windows/Fallback)
- **Technology**: WebDriver screenshot stitching
- **Frame Rate**: 5 FPS (screenshot every 200ms)
- **Resolution**: 1300x760 (scaled)
- **Codec**: H.264 with optimized settings
- **Benefits**: Universal compatibility, no additional dependencies

## Configuration

The video recorder uses optimized settings:

**X11 Recording (macOS/Linux):**
- **Resolution**: 1300x760
- **Frame Rate**: 30 FPS
- **Codec**: H.264 (libx264)
- **Preset**: fast
- **CRF**: 23 (high quality)

**Screenshot Recording (Windows/Fallback):**
- **Resolution**: 1300x760 (scaled)
- **Frame Rate**: 5 FPS
- **Codec**: H.264 (libx264)
- **Pixel Format**: yuv420p

## Integration Points

The video recording integrates with the FTR lifecycle:

- **Platform Detection**: Automatic method selection on startup
- **Start Recording**: `beforeTests` lifecycle phase
- **Stop Recording**: `cleanup` and `testFailure` lifecycle phases
- **Process Management**: Proper cleanup of X11 displays and ffmpeg processes

## Troubleshooting

### High-Performance Recording Not Working

**macOS:**
1. Ensure XQuartz is installed: `brew list --cask | grep xquartz`
2. Restart terminal after XQuartz installation
3. Check if X11 is available: `which X`
4. Verify ffmpeg installation: `ffmpeg -version`

**Linux:**
1. Check Xvfb installation: `which Xvfb`
2. Verify ffmpeg installation: `ffmpeg -version`
3. Ensure X11 lock files are writable: `ls -la /tmp/.X*-lock`

**All Platforms:**
1. Check video directory permissions: `target/functional-tests/videos/`
2. Monitor logs for platform detection: Look for "Using recording method" messages
3. Verify browser service availability in test configuration

### Performance Issues

**If recording is slow:**
- Check if fallback method is being used (should show 5 FPS vs 30+ FPS in logs)
- Ensure X11 dependencies are properly installed
- Monitor CPU usage during recording

**If videos are large:**
- X11 recording produces smaller files than screenshot method
- Consider using `--headless` flag to reduce visual complexity
- Videos are automatically cleaned up after test completion

### Common Error Messages

**"Using recording method: screenshot"** on macOS/Linux:
- Indicates fallback to lower performance method
- Install XQuartz (macOS) or Xvfb (Linux) for better performance

**"Failed to start video recording"**:
- Check ffmpeg installation and PATH
- Verify write permissions to video directory
- Ensure browser service is available

## Implementation Details

The hybrid video recording is implemented in:

- **`VideoRecorder` class**: Core recording functionality with platform detection
- **Platform Detection**: Automatic X11 availability checking
- **X11 Display Management**: Virtual display allocation and lifecycle
- **Process Management**: Proper cleanup of Xvfb and ffmpeg processes
- **FunctionalTestRunner**: Lifecycle integration
- **CLI Integration**: `--record-video` flag support in both FTR and functional_tests

### Architecture

```
VideoRecorder
├── detectRecordingMethod() → 'x11grab' | 'screenshot'
├── X11 Recording (macOS/Linux)
│   ├── XQuartz/Xvfb process management
│   ├── Display allocation (:99, :98, etc.)
│   └── Direct ffmpeg screen capture
└── Screenshot Recording (Windows/Fallback)
    ├── WebDriver screenshot capture
    ├── Temporary file management
    └── Post-processing with ffmpeg
```

The implementation gracefully handles missing dependencies and automatically selects the best available recording method for optimal performance and compatibility.
